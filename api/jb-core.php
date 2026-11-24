<?php
declare(strict_types=1);

const JB_ADMIN_EMAIL = 'admin@jb.com';
const JB_PASSWORD_SALT = '6f627ea7791c7773190c82557cdbf983';
const JB_PASSWORD_HASH = '19821bafc1c6479aea902c14a2a8d23bf814f4c07d4798ed7b6e5a4dc0c2a871';

function jb_data_dir(): string {
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage';
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); }
    return $dir;
}

function jb_db(): PDO {
    static $db;
    if ($db instanceof PDO) return $db;
    $db = new PDO('sqlite:' . jb_data_dir() . DIRECTORY_SEPARATOR . 'jb-admin.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    $db->exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, must_change_password INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, reference TEXT UNIQUE, service_type TEXT NOT NULL, name TEXT, company TEXT, email TEXT NOT NULL, phone TEXT, status TEXT DEFAULT 'new', budget TEXT, source TEXT, details TEXT, estimate INTEGER DEFAULT 0, consent_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'active', tags TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, client_id INTEGER, name TEXT NOT NULL, type TEXT, status TEXT DEFAULT 'planning', progress INTEGER DEFAULT 0, budget INTEGER DEFAULT 0, start_date TEXT, due_date TEXT, url TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL);
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, project_id INTEGER, title TEXT NOT NULL, status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium', due_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY, client_id INTEGER, reference TEXT UNIQUE, amount INTEGER DEFAULT 0, currency TEXT DEFAULT 'XAF', status TEXT DEFAULT 'draft', due_date TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL);
    CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, system_type TEXT NOT NULL, content TEXT NOT NULL, inputs TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, price_from INTEGER DEFAULT 0, currency TEXT DEFAULT 'XAF', status TEXT DEFAULT 'active', description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS content_items (id INTEGER PRIMARY KEY, page TEXT NOT NULL, section TEXT NOT NULL, title TEXT, content TEXT, seo_title TEXT, seo_description TEXT, status TEXT DEFAULT 'draft', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, user_email TEXT, action TEXT NOT NULL, entity TEXT, entity_id INTEGER, ip TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);");
    $stmt = $db->prepare('INSERT OR IGNORE INTO users(email,password_hash,password_salt) VALUES(?,?,?)');
    $stmt->execute([JB_ADMIN_EMAIL, JB_PASSWORD_HASH, JB_PASSWORD_SALT]);
    return $db;
}

function jb_json(int $status, array $data): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jb_payload(): array {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 100000) jb_json(413, ['ok'=>false,'message'=>'Payload too large.']);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function jb_clean($value, int $max = 4000): string {
    $value = trim((string)$value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $max, 'UTF-8') : substr($value, 0, $max);
}

function jb_hash_password(string $password, string $salt): string {
    return hash_pbkdf2('sha256', $password, $salt, 210000, 64, false);
}

function jb_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('jb_admin');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!empty($_SERVER['HTTPS']),'httponly'=>true,'samesite'=>'Strict']);
    session_start();
}

function jb_csrf(): string {
    jb_session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
    return $_SESSION['csrf'];
}

function jb_require_admin(): void {
    jb_session_start();
    if (empty($_SESSION['admin_email']) || empty($_SESSION['last_seen']) || time() - (int)$_SESSION['last_seen'] > 3600) {
        session_unset(); jb_json(401, ['ok'=>false,'message'=>'Authentication required.']);
    }
    $_SESSION['last_seen'] = time();
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!hash_equals((string)($_SESSION['csrf'] ?? ''), $token)) jb_json(403, ['ok'=>false,'message'=>'Invalid CSRF token.']);
    }
}

function jb_audit(string $action, string $entity = '', ?int $id = null): void {
    $stmt = jb_db()->prepare('INSERT INTO audit_log(user_email,action,entity,entity_id,ip) VALUES(?,?,?,?,?)');
    $stmt->execute([$_SESSION['admin_email'] ?? 'public', $action, $entity, $id, $_SERVER['REMOTE_ADDR'] ?? '']);
}

function jb_store_lead(array $data): string {
    $reference = jb_clean($data['reference'] ?? ('JB-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)))), 40);
    $stmt = jb_db()->prepare('INSERT OR REPLACE INTO leads(reference,service_type,name,company,email,phone,status,budget,source,details,estimate,consent_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)');
    $stmt->execute([$reference,jb_clean($data['service_type'] ?? 'general',50),jb_clean($data['name'] ?? '',150),jb_clean($data['company'] ?? '',150),jb_clean($data['email'] ?? '',180),jb_clean($data['phone'] ?? '',80),'new',jb_clean($data['budget'] ?? '',100),jb_clean($data['source'] ?? 'website',100),json_encode($data['details'] ?? [],JSON_UNESCAPED_UNICODE),intval($data['estimate'] ?? 0),gmdate('c')]);
    return $reference;
}
