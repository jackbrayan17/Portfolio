<?php
declare(strict_types=1);

const ACADEMY_FROM_EMAIL = 'academy@jackbrayan.com';
const ACADEMY_FROM_NAME = 'JB Academy';
const ADMIN_EMAIL = 'jackbrayan1707@gmail.com';
const LOGO_URL = 'https://jackbrayan.com/jb_logo.png';
const ACADEMY_URL = 'https://jackbrayan.com/academy/';
const TELEGRAM_URL = 'https://t.me/+K5MJK6HmlWQ4NTlk';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/JTVur2dpy35JJAdrFlpQxo';
const WHATSAPP_PHONE_DISPLAY = '+237 694 10 35 85';
const WHATSAPP_PHONE_URL = 'https://wa.me/237694103585?text=Hello%20JB%20Academy%2C%20I%20just%20submitted%20my%20subscription%20form.';

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, false, 'Method not allowed.');
}

$payload = read_payload();

if (clean_value($payload['website'] ?? '') !== '') {
    json_response(200, true, 'Subscription received.');
}

$name = clean_value($payload['name'] ?? '', 120);
$email = clean_value($payload['email'] ?? '', 180);
$whatsapp = clean_value($payload['whatsapp'] ?? '', 80);
$plan = clean_value($payload['plan'] ?? '', 180);
$path = clean_value($payload['path'] ?? '', 180);
$level = clean_value($payload['level'] ?? '', 80);
$message = clean_value($payload['message'] ?? '', 2200);

if ($name === '' || $email === '' || $whatsapp === '' || $plan === '' || $path === '' || $level === '' || $message === '') {
    json_response(422, false, 'Please complete all required fields.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(422, false, 'Please provide a valid email address.');
}

$submittedAt = gmdate('Y-m-d H:i:s') . ' UTC';
$sourceUrl = clean_value($_SERVER['HTTP_REFERER'] ?? ACADEMY_URL, 300);
$remoteAddress = clean_value($_SERVER['REMOTE_ADDR'] ?? 'Unknown', 80);

$applicationRows = [
    'Full name' => $name,
    'Email' => $email,
    'WhatsApp' => $whatsapp,
    'Plan' => $plan,
    'Learning path' => $path,
    'Current level' => $level,
    'Objective' => $message,
];

$userHtml = render_user_email($name, $applicationRows);
$adminHtml = render_admin_email($applicationRows, $submittedAt, $sourceUrl, $remoteAddress);

$userSent = send_html_mail(
    $email,
    'JB Academy - Your subscription request is received',
    $userHtml,
    ACADEMY_FROM_EMAIL,
    ACADEMY_FROM_NAME
);

$adminSent = send_html_mail(
    ADMIN_EMAIL,
    'New JB Academy subscription - ' . $name,
    $adminHtml,
    $email,
    $name
);

if (!$userSent || !$adminSent) {
    json_response(500, false, 'Unable to send the confirmation emails right now.');
}

json_response(200, true, 'Subscription sent successfully.');

function read_payload(): array
{
    $raw = file_get_contents('php://input') ?: '';

    if (strlen($raw) > 24000) {
        json_response(413, false, 'The submitted form is too large.');
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            json_response(400, false, 'Invalid JSON payload.');
        }
        return $decoded;
    }

    return $_POST;
}

function clean_value($value, int $maxLength = 1000): string
{
    $value = trim((string) $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }

    return substr($value, 0, $maxLength);
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_user_email(string $name, array $rows): string
{
    $summary = render_info_table($rows);
    $firstName = trim(explode(' ', $name)[0] ?? $name);
    $firstName = $firstName !== '' ? $firstName : $name;

    $content = '
        <h1 style="margin:0 0 14px;color:#fbfaf5;font-size:28px;line-height:1.15;font-family:Georgia,serif;">Bienvenue a JB Academy, ' . e($firstName) . '.</h1>
        <p style="margin:0 0 18px;color:#d9e5f2;font-size:15px;line-height:1.7;">Votre demande d&apos;inscription a bien ete recue. Vous pouvez deja rejoindre les hubs de la communaute pour recevoir les ressources, annonces et prochaines etapes.</p>
        <div style="margin:24px 0 8px;">
            ' . render_button(TELEGRAM_URL, 'Rejoindre Telegram', '#38bdf8') . '
            ' . render_button(WHATSAPP_GROUP_URL, 'Rejoindre WhatsApp Hub', '#22c55e') . '
        </div>
        <p style="margin:18px 0 0;color:#b9c7d8;font-size:14px;line-height:1.7;">Besoin d&apos;une reponse directe ? Ecrivez a JB Academy sur WhatsApp : <a href="' . e(WHATSAPP_PHONE_URL) . '" style="color:#7dd3fc;text-decoration:none;font-weight:700;">' . e(WHATSAPP_PHONE_DISPLAY) . '</a>.</p>
        <h2 style="margin:30px 0 12px;color:#fbfaf5;font-size:18px;">Resume de votre demande</h2>
        ' . $summary . '
        <p style="margin:24px 0 0;color:#9fb1c7;font-size:13px;line-height:1.7;">Si une information est incorrecte, repondez simplement a cet email ou contactez-nous sur WhatsApp.</p>
    ';

    return render_email_shell('JB Academy subscription confirmation', $content);
}

function render_admin_email(array $rows, string $submittedAt, string $sourceUrl, string $remoteAddress): string
{
    $adminRows = $rows + [
        'Submitted at' => $submittedAt,
        'Source page' => $sourceUrl,
        'IP address' => $remoteAddress,
    ];
    $studentWhatsappUrl = whatsapp_url_from_input((string) $rows['WhatsApp']);
    $whatsappButton = $studentWhatsappUrl !== ''
        ? render_button($studentWhatsappUrl, 'Contacter sur WhatsApp', '#22c55e')
        : '';

    $content = '
        <h1 style="margin:0 0 14px;color:#fbfaf5;font-size:28px;line-height:1.15;font-family:Georgia,serif;">Nouvelle inscription JB Academy</h1>
        <p style="margin:0 0 22px;color:#d9e5f2;font-size:15px;line-height:1.7;">Un visiteur vient de remplir le formulaire d&apos;abonnement sur jackbrayan.com.</p>
        ' . render_info_table($adminRows) . '
        <div style="margin:24px 0 0;">
            ' . render_button('mailto:' . (string) $rows['Email'], 'Repondre par email', '#38bdf8') . '
            ' . $whatsappButton . '
        </div>
    ';

    return render_email_shell('New JB Academy subscription', $content);
}

function render_email_shell(string $preheader, string $content): string
{
    return '<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JB Academy</title>
</head>
<body style="margin:0;padding:0;background:#080d16;font-family:Inter,Arial,sans-serif;color:#fbfaf5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . e($preheader) . '</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d16;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:34px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:separate;">
          <tr>
            <td style="padding:0 0 18px;text-align:center;">
              <img src="' . e(LOGO_URL) . '" width="74" height="74" alt="JB Academy" style="display:inline-block;border-radius:50%;border:1px solid rgba(125,211,252,.45);box-shadow:0 14px 38px rgba(14,165,233,.24);">
              <div style="margin-top:12px;color:#7dd3fc;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">JB Academy</div>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1220;border:1px solid rgba(255,255,255,.10);border-radius:22px;padding:30px;box-shadow:0 24px 70px rgba(0,0,0,.35);">
              ' . $content . '
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;text-align:center;color:#78889f;font-size:12px;line-height:1.6;">
              Envoye par JB Academy depuis <a href="' . e(ACADEMY_URL) . '" style="color:#7dd3fc;text-decoration:none;">jackbrayan.com/academy</a><br>
              ' . e(ACADEMY_FROM_EMAIL) . ' | ' . e(WHATSAPP_PHONE_DISPLAY) . '
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function render_info_table(array $rows): string
{
    $html = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">';

    foreach ($rows as $label => $value) {
        $html .= '<tr>';
        $html .= '<td style="width:34%;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.07);color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;vertical-align:top;">' . e((string) $label) . '</td>';
        $html .= '<td style="padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.07);color:#edf6ff;font-size:14px;line-height:1.6;vertical-align:top;">' . nl2br(e((string) $value)) . '</td>';
        $html .= '</tr>';
    }

    return $html . '</table>';
}

function render_button(string $href, string $label, string $color): string
{
    return '<a href="' . e($href) . '" target="_blank" rel="noopener" style="display:inline-block;margin:0 10px 12px 0;padding:12px 16px;border-radius:999px;background:' . e($color) . ';color:#07111f;text-decoration:none;font-size:13px;font-weight:800;">' . e($label) . '</a>';
}

function whatsapp_url_from_input(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    if (strpos($digits, '00') === 0) {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) === 9 && $digits[0] === '6') {
        $digits = '237' . $digits;
    }
    if (strlen($digits) < 8) {
        return '';
    }

    return 'https://wa.me/' . $digits . '?text=' . rawurlencode('Hello, I received your JB Academy subscription request.');
}

function send_html_mail(string $to, string $subject, string $html, string $replyToEmail, string $replyToName): bool
{
    $replyToEmail = filter_var($replyToEmail, FILTER_VALIDATE_EMAIL) ? $replyToEmail : ACADEMY_FROM_EMAIL;
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: ' . mailbox_header(ACADEMY_FROM_NAME, ACADEMY_FROM_EMAIL),
        'Reply-To: ' . mailbox_header($replyToName, $replyToEmail),
        'X-Mailer: PHP/' . phpversion(),
    ];

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headerString = implode("\r\n", $headers);

    if (DIRECTORY_SEPARATOR === '/') {
        return @mail($to, $encodedSubject, $html, $headerString, '-f' . ACADEMY_FROM_EMAIL);
    }

    return @mail($to, $encodedSubject, $html, $headerString);
}

function mailbox_header(string $name, string $email): string
{
    $name = safe_header($name);
    if ($name === '') {
        return '<' . $email . '>';
    }

    return '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>';
}

function safe_header(string $value): string
{
    return trim(preg_replace('/[\r\n]+/', ' ', $value) ?? '');
}

function json_response(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode([
        'ok' => $ok,
        'message' => $message,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}
