<?php
declare(strict_types=1);
require_once __DIR__ . '/jb-core.php';

$action = $_GET['action'] ?? 'session';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = jb_db();

if ($action === 'login' && $method === 'POST') {
    jb_session_start();
    $data = jb_payload();
    $email = strtolower(jb_clean($data['email'] ?? '', 180));
    $password = (string)($data['password'] ?? '');
    $key = 'login_attempts_' . ($_SERVER['REMOTE_ADDR'] ?? 'local');
    if (($_SESSION[$key]['until'] ?? 0) > time()) jb_json(429, ['ok'=>false,'message'=>'Too many attempts. Try again later.']);
    $stmt = $db->prepare('SELECT * FROM users WHERE email=?'); $stmt->execute([$email]); $user = $stmt->fetch();
    if (!$user || !hash_equals($user['password_hash'], jb_hash_password($password, $user['password_salt']))) {
        $count = (int)($_SESSION[$key]['count'] ?? 0) + 1; $_SESSION[$key] = ['count'=>$count,'until'=>$count >= 5 ? time()+900 : 0];
        jb_json(401, ['ok'=>false,'message'=>'Invalid email or password.']);
    }
    session_regenerate_id(true); unset($_SESSION[$key]); $_SESSION['admin_email'] = $email; $_SESSION['last_seen'] = time();
    jb_audit('login'); jb_json(200, ['ok'=>true,'csrf'=>jb_csrf(),'user'=>['email'=>$email,'mustChangePassword'=>(bool)$user['must_change_password']]]);
}

if ($action === 'logout' && $method === 'POST') { jb_require_admin(); jb_audit('logout'); session_destroy(); jb_json(200,['ok'=>true]); }
if ($action === 'session') { jb_session_start(); if (empty($_SESSION['admin_email'])) jb_json(401,['ok'=>false]); $_SESSION['last_seen']=time(); jb_json(200,['ok'=>true,'csrf'=>jb_csrf(),'user'=>['email'=>$_SESSION['admin_email']]]); }
jb_require_admin();

if ($action === 'dashboard') {
    $counts=[]; foreach(['leads','clients','projects','tasks','invoices','services','content_items'] as $table) $counts[$table]=(int)$db->query("SELECT COUNT(*) FROM $table")->fetchColumn();
    $counts['pipeline']=(int)$db->query("SELECT COALESCE(SUM(budget),0) FROM projects WHERE status NOT IN ('completed','cancelled')")->fetchColumn();
    $recent=$db->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 6')->fetchAll();
    jb_json(200,['ok'=>true,'counts'=>$counts,'recent'=>$recent]);
}

if ($action === 'change-password' && $method === 'POST') {
    $data=jb_payload(); $password=(string)($data['password']??'');
    if (strlen($password)<10) jb_json(422,['ok'=>false,'message'=>'Use at least 10 characters.']);
    $salt=bin2hex(random_bytes(16)); $stmt=$db->prepare('UPDATE users SET password_hash=?,password_salt=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE email=?');
    $stmt->execute([jb_hash_password($password,$salt),$salt,$_SESSION['admin_email']]); jb_audit('change_password'); jb_json(200,['ok'=>true]);
}

$tables=['leads','clients','projects','tasks','invoices','prompts','services','content_items','audit_log'];
if ($action === 'resource') {
    $table=$_GET['table']??''; if(!in_array($table,$tables,true)) jb_json(404,['ok'=>false]);
    if ($method==='GET') { $rows=$db->query("SELECT * FROM $table ORDER BY created_at DESC LIMIT 500")->fetchAll(); jb_json(200,['ok'=>true,'rows'=>$rows]); }
    $schemas=[
      'leads'=>['reference','service_type','name','company','email','phone','status','budget','source','details','estimate'],
      'clients'=>['name','company','email','phone','status','tags','notes'],
      'projects'=>['client_id','name','type','status','progress','budget','start_date','due_date','url','notes'],
      'tasks'=>['project_id','title','status','priority','due_date','notes'],
      'invoices'=>['client_id','reference','amount','currency','status','due_date','notes'],
      'prompts'=>['title','system_type','content','inputs'],
      'services'=>['name','category','price_from','currency','status','description'],
      'content_items'=>['page','section','title','content','seo_title','seo_description','status']
    ];
    if(!isset($schemas[$table])) jb_json(405,['ok'=>false]); $data=jb_payload();
    if($method==='DELETE'){ $id=(int)($data['id']??0); $stmt=$db->prepare("DELETE FROM $table WHERE id=?");$stmt->execute([$id]);jb_audit('delete',$table,$id);jb_json(200,['ok'=>true]); }
    $fields=array_values(array_filter($schemas[$table],fn($f)=>array_key_exists($f,$data)));
    if(!$fields) jb_json(422,['ok'=>false,'message'=>'No valid fields.']);
    $values=array_map(fn($f)=>in_array($f,['client_id','project_id','progress','budget','amount','estimate','price_from'],true)?(int)$data[$f]:jb_clean($data[$f],20000),$fields);
    $id=(int)($data['id']??0);
    if($id){$set=implode(',',array_map(fn($f)=>"$f=?",$fields));$stmt=$db->prepare("UPDATE $table SET $set,updated_at=CURRENT_TIMESTAMP WHERE id=?");$stmt->execute([...$values,$id]);jb_audit('update',$table,$id);}
    else{$cols=implode(',',$fields);$marks=implode(',',array_fill(0,count($fields),'?'));$stmt=$db->prepare("INSERT INTO $table($cols) VALUES($marks)");$stmt->execute($values);$id=(int)$db->lastInsertId();jb_audit('create',$table,$id);}
    jb_json(200,['ok'=>true,'id'=>$id]);
}

jb_json(404,['ok'=>false,'message'=>'Not found.']);
