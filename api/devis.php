<?php
declare(strict_types=1);
require_once __DIR__ . '/jb-core.php';

const DEVIS_FROM_EMAIL = 'automatisation@jackbrayan.com';
const DEVIS_FROM_NAME = 'Jack Brayan — Automatisation';
const ADMIN_EMAIL = 'jackbrayan1707@gmail.com';
const LOGO_URL = 'https://jackbrayan.com/jb_logo.png';
const PAGE_URL = 'https://jackbrayan.com/automatisation/';
const ADMIN_WHATSAPP_PHONE = '237694103585';

const MODULES = [
    'welcome_emails_invoices' => ['label_fr' => 'Emails de bienvenue & factures automatiques', 'label_en' => 'Automatic welcome emails & invoices', 'price' => 35000],
    'auto_appointments' => ['label_fr' => 'Prise de rendez-vous automatisee (calendrier + rappels)', 'label_en' => 'Automated appointment booking (calendar + reminders)', 'price' => 60000],
    'data_sync' => ['label_fr' => 'Synchronisation de donnees entre vos applications', 'label_en' => 'Data synchronization between your applications', 'price' => 70000],
    'whatsapp_chatbot_night' => ['label_fr' => 'Assistant virtuel WhatsApp / Facebook (reponses 24h/24)', 'label_en' => 'WhatsApp / Facebook virtual assistant (24/7 replies)', 'price' => 75000],
    'chatbot_knows_prices_stock' => ['label_fr' => 'Chatbot connecte a vos prix, stocks ou documents', 'label_en' => 'Chatbot connected to your prices, stock or documents', 'price' => 150000],
    'chatbot_records_orders' => ['label_fr' => 'Enregistrement automatique des commandes', 'label_en' => 'Automatic order recording', 'price' => 45000],
];

const TIERS = [
    'Petit budget / Essai' => ['name_fr' => 'Essentiel', 'name_en' => 'Essentials', 'min' => 50000, 'max' => 120000],
    'Investissement standard' => ['name_fr' => 'Standard', 'name_en' => 'Standard', 'min' => 150000, 'max' => 300000],
    'Projet sur mesure / Evolutif' => ['name_fr' => 'Sur-mesure', 'name_en' => 'Custom', 'min' => 350000, 'max' => 0],
];

const MESSAGES = [
    'fr' => [
        'method_not_allowed' => 'Methode non autorisee.',
        'too_large' => 'Le formulaire soumis est trop volumineux.',
        'invalid_json' => 'Payload JSON invalide.',
        'missing_field' => 'Merci de completer le champ : ',
        'invalid_email' => 'Merci de renseigner une adresse email valide.',
        'consent_required' => "Merci d'accepter le traitement de vos donnees pour recevoir votre devis.",
        'needs_required' => 'Merci de selectionner au moins un besoin a automatiser.',
        'send_failed' => "Impossible d'envoyer les emails pour le moment.",
        'send_success' => 'Devis envoye avec succes.',
        'received' => 'Demande recue.',
    ],
    'en' => [
        'method_not_allowed' => 'Method not allowed.',
        'too_large' => 'The submitted form is too large.',
        'invalid_json' => 'Invalid JSON payload.',
        'missing_field' => 'Please complete the field: ',
        'invalid_email' => 'Please provide a valid email address.',
        'consent_required' => 'Please accept the data processing to receive your quote.',
        'needs_required' => 'Please select at least one need to automate.',
        'send_failed' => 'Unable to send the emails right now.',
        'send_success' => 'Quote sent successfully.',
        'received' => 'Request received.',
    ],
];

const FIELD_LABELS = [
    'fr' => [
        'company' => 'Entreprise', 'sector' => 'Secteur', 'team_size' => "Taille d'equipe",
        'phone' => 'Telephone', 'email' => 'Email', 'source' => 'Provenance',
        'time_task' => 'Tache chronophage', 'contact_mgmt' => 'Gestion des contacts',
        'time_lost' => 'Temps perdu par semaine', 'priority' => 'Objectif prioritaire',
        'start' => 'Delai de demarrage', 'budget' => 'Budget',
    ],
    'en' => [
        'company' => 'Company', 'sector' => 'Sector', 'team_size' => 'Team size',
        'phone' => 'Phone', 'email' => 'Email', 'source' => 'Source',
        'time_task' => 'Time-consuming task', 'contact_mgmt' => 'Contact management',
        'time_lost' => 'Time lost per week', 'priority' => 'Priority goal',
        'start' => 'Start timing', 'budget' => 'Budget',
    ],
];

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$earlyPayload = read_payload();
$lang = normalize_lang($earlyPayload['lang'] ?? 'fr');
$payload = $earlyPayload;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, false, MESSAGES[$lang]['method_not_allowed']);
}

if (clean_value($payload['website'] ?? '') !== '') {
    json_response(200, true, MESSAGES[$lang]['received'], ['submissionId' => generate_submission_id()]);
}

$company = clean_value($payload['company_name'] ?? '', 150);
$sector = clean_value($payload['sector'] ?? '', 80);
$teamSize = clean_value($payload['team_size'] ?? '', 80);
$phone = clean_value($payload['phone'] ?? '', 80);
$email = clean_value($payload['email'] ?? '', 180);
$socialUrl = clean_value($payload['social_url'] ?? '', 250);
$source = clean_value($payload['source'] ?? '', 80);

$timeTask = clean_value($payload['biggest_time_task'] ?? '', 150);
$contactManagement = clean_value($payload['contact_management'] ?? '', 80);
$weeklyTimeLost = clean_value($payload['weekly_time_lost'] ?? '', 80);
$whatsappBusiness = clean_value($payload['whatsapp_business'] ?? '', 20);

$priority = clean_value($payload['priority_goal'] ?? '', 80);
$startTiming = clean_value($payload['start_timing'] ?? '', 80);
$budget = clean_value($payload['budget'] ?? '', 80);
$message = clean_value($payload['message'] ?? '', 2000);
$consent = clean_value($payload['consent'] ?? '', 10);

$needs = [];
if (isset($payload['needs']) && is_array($payload['needs'])) {
    foreach ($payload['needs'] as $need) {
        $need = clean_value((string) $need, 60);
        if (isset(MODULES[$need])) {
            $needs[] = $need;
        }
    }
}

$required = [
    'company' => $company,
    'sector' => $sector,
    'team_size' => $teamSize,
    'phone' => $phone,
    'email' => $email,
    'source' => $source,
    'time_task' => $timeTask,
    'contact_mgmt' => $contactManagement,
    'time_lost' => $weeklyTimeLost,
    'priority' => $priority,
    'start' => $startTiming,
    'budget' => $budget,
];

foreach ($required as $key => $value) {
    if ($value === '') {
        json_response(422, false, MESSAGES[$lang]['missing_field'] . FIELD_LABELS[$lang][$key]);
    }
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(422, false, MESSAGES[$lang]['invalid_email']);
}

if ($consent !== '1' && strtolower($consent) !== 'on' && strtolower($consent) !== 'true') {
    json_response(422, false, MESSAGES[$lang]['consent_required']);
}

if (empty($needs)) {
    json_response(422, false, MESSAGES[$lang]['needs_required']);
}

$submissionId = generate_submission_id();
$submittedAt = gmdate('Y-m-d H:i:s') . ' UTC';
$validUntil = gmdate('d/m/Y', strtotime('+7 days'));
$sourceUrl = clean_value($_SERVER['HTTP_REFERER'] ?? PAGE_URL, 300);
$remoteAddress = clean_value($_SERVER['REMOTE_ADDR'] ?? 'Unknown', 80);

$quote = build_quote($needs, $budget, $lang);

jb_store_lead([
    'reference' => $submissionId, 'service_type' => 'automation', 'name' => $company,
    'company' => $company, 'email' => $email, 'phone' => $phone, 'budget' => $budget,
    'source' => $source, 'estimate' => $quote['total'],
    'details' => ['sector'=>$sector, 'team_size'=>$teamSize, 'needs'=>$needs, 'priority'=>$priority, 'start_timing'=>$startTiming, 'message'=>$message],
]);

$clientRows = [
    FIELD_LABELS[$lang]['company'] => $company,
    FIELD_LABELS[$lang]['sector'] => $sector,
    FIELD_LABELS[$lang]['team_size'] => $teamSize,
    FIELD_LABELS[$lang]['phone'] => $phone,
    FIELD_LABELS[$lang]['email'] => $email,
    FIELD_LABELS[$lang]['source'] => $source,
    FIELD_LABELS[$lang]['time_task'] => $timeTask,
    FIELD_LABELS[$lang]['contact_mgmt'] => $contactManagement,
    FIELD_LABELS[$lang]['time_lost'] => $weeklyTimeLost,
    FIELD_LABELS[$lang]['priority'] => $priority,
    FIELD_LABELS[$lang]['start'] => $startTiming,
    FIELD_LABELS[$lang]['budget'] => $budget,
];

$adminRows = [
    'Entreprise' => $company,
    'Secteur' => $sector,
    "Taille d'equipe" => $teamSize,
    'Telephone / WhatsApp' => $phone,
    'Email' => $email,
    'Page / reseau social' => $socialUrl !== '' ? $socialUrl : '-',
    'Provenance' => $source,
    'Langue du client' => $lang === 'en' ? 'Anglais' : 'Francais',
    'Tache la plus chronophage' => $timeTask,
    'Gestion des contacts actuelle' => $contactManagement,
    'Temps perdu par semaine' => $weeklyTimeLost,
    'Compte WhatsApp Business' => $whatsappBusiness !== '' ? $whatsappBusiness : '-',
    'Objectif prioritaire' => $priority,
    'Demarrage souhaite' => $startTiming,
    'Budget' => $budget,
    'Precisions' => $message !== '' ? $message : '-',
];

$clientHtml = render_client_email($lang, $company, $submissionId, $validUntil, $quote, $clientRows);
$adminQuoteLines = build_admin_quote($needs);
$adminHtml = render_admin_email($submissionId, $submittedAt, $sourceUrl, $remoteAddress, $quote, $adminQuoteLines, $adminRows, $phone);

$clientSubject = $lang === 'en'
    ? 'Your personalized digitalization quote — ' . $company
    : 'Votre devis personnalise de digitalisation — ' . $company;

$clientSent = send_html_mail(
    $email,
    $clientSubject,
    $clientHtml,
    DEVIS_FROM_EMAIL,
    DEVIS_FROM_NAME
);

$adminSent = send_html_mail(
    ADMIN_EMAIL,
    'Nouvelle demande de devis automatisation — ' . $company . ' (' . $submissionId . ')',
    $adminHtml,
    $email,
    $company
);

if (!$clientSent || !$adminSent) {
    json_response(500, false, MESSAGES[$lang]['send_failed'], ['submissionId' => $submissionId]);
}

json_response(200, true, MESSAGES[$lang]['send_success'], [
    'submissionId' => $submissionId,
    'tier' => $quote['tier'],
    'total' => $quote['total'],
]);

function build_quote(array $needs, string $budget, string $lang): array
{
    $labelKey = $lang === 'en' ? 'label_en' : 'label_fr';
    $nameKey = $lang === 'en' ? 'name_en' : 'name_fr';
    $lines = [];
    $total = 0;
    foreach ($needs as $need) {
        $module = MODULES[$need];
        $lines[] = ['label' => $module[$labelKey], 'price' => $module['price']];
        $total += $module['price'];
    }

    $tierKey = TIERS[$budget] ?? TIERS['Investissement standard'];
    $tierMin = max($tierKey['min'], (int) round($total * 0.85));
    $tierMax = $tierKey['max'] > 0 ? max($tierKey['max'], (int) round($total * 1.15)) : 0;
    $maintenance = (int) round($total * 0.08 / 1000) * 1000;
    if ($maintenance < 10000) {
        $maintenance = 10000;
    }

    return [
        'tier' => $tierKey[$nameKey],
        'lines' => $lines,
        'total' => $total,
        'rangeMin' => $tierMin,
        'rangeMax' => $tierMax,
        'maintenance' => $maintenance,
    ];
}

function build_admin_quote(array $needs): array
{
    $lines = [];
    foreach ($needs as $need) {
        $module = MODULES[$need];
        $lines[] = ['label' => $module['label_fr'], 'price' => $module['price']];
    }
    return $lines;
}

function normalize_lang($value): string
{
    $value = strtolower(trim((string) $value));
    return $value === 'en' ? 'en' : 'fr';
}

function generate_submission_id(): string
{
    $date = gmdate('Ymd');
    $random = strtoupper(bin2hex(random_bytes(2)));
    return 'JB-' . $date . '-' . $random;
}

function read_payload(): array
{
    $raw = file_get_contents('php://input') ?: '';

    if (strlen($raw) > 30000) {
        json_response(413, false, 'Le formulaire soumis est trop volumineux.');
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            json_response(400, false, 'Payload JSON invalide.');
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

function money(int $value): string
{
    return number_format($value, 0, ',', ' ') . ' FCFA';
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_quote_lines(array $lines): string
{
    $html = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;margin:14px 0;">';
    foreach ($lines as $line) {
        $html .= '<tr>';
        $html .= '<td style="padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.07);color:#edf6ff;font-size:14px;line-height:1.5;">' . e($line['label']) . '</td>';
        $html .= '<td style="padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.07);color:#7dd3fc;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;">' . e(money($line['price'])) . '</td>';
        $html .= '</tr>';
    }
    return $html . '</table>';
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

function whatsapp_url_from_input(string $value, string $prefillText): string
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
    return 'https://wa.me/' . $digits . '?text=' . rawurlencode($prefillText);
}

function render_client_email(string $lang, string $company, string $submissionId, string $validUntil, array $quote, array $rows): string
{
    $t = $lang === 'en' ? [
        'h1' => 'Your personalized quote is ready, %s.',
        'ref' => 'Reference: %s &middot; Valid until %s',
        'intro' => 'Based on your answers, here is the recommended formula: <strong style="color:#7dd3fc;">%s</strong>, with the following automations:',
        'estimate' => 'Project estimate',
        'from' => 'from %s',
        'maintenance' => 'Monthly maintenance (optional)',
        'perMonth' => '/ month',
        'confirm' => 'Confirm and get started on WhatsApp',
        'question' => 'Ask a question',
        'questionSubject' => 'Question about my quote %s',
        'summary' => 'Summary of your answers',
        'footer' => "An advisor will contact you within 24h by WhatsApp or email to refine this quote. In the meantime, check out our work at <a href=\"https://jackbrayan.com/#projects\" style=\"color:#7dd3fc;\">jackbrayan.com</a>.",
        'preheader' => 'Your digitalization quote',
        'whatsappConfirm' => 'Hi Jack, I confirm my quote request %s (%s). I would like to get started.',
    ] : [
        'h1' => 'Votre devis personnalise est pret, %s.',
        'ref' => 'Reference : %s &middot; Valable jusqu\'au %s',
        'intro' => 'Sur la base de vos reponses, voici la formule recommandee : <strong style="color:#7dd3fc;">%s</strong>, avec les automatisations suivantes :',
        'estimate' => 'Estimation du projet',
        'from' => 'a partir de %s',
        'maintenance' => 'Maintenance mensuelle (optionnelle)',
        'perMonth' => '/ mois',
        'confirm' => 'Confirmer et demarrer sur WhatsApp',
        'question' => 'Poser une question',
        'questionSubject' => 'Question sur mon devis %s',
        'summary' => 'Resume de vos reponses',
        'footer' => 'Un conseiller vous recontacte sous 24h via WhatsApp ou email pour affiner ce devis. En attendant, decouvrez nos realisations sur <a href="https://jackbrayan.com/#projects" style="color:#7dd3fc;">jackbrayan.com</a>.',
        'preheader' => 'Votre devis de digitalisation',
        'whatsappConfirm' => 'Bonjour Jack, je confirme ma demande de devis %s (%s). Je souhaite demarrer.',
    ];

    $rangeLabel = $quote['rangeMax'] > 0
        ? money($quote['rangeMin']) . ' — ' . money($quote['rangeMax'])
        : sprintf($t['from'], money($quote['rangeMin']));

    $whatsappConfirm = 'https://wa.me/' . ADMIN_WHATSAPP_PHONE . '?text=' . rawurlencode(
        sprintf($t['whatsappConfirm'], $submissionId, $company)
    );

    $content = '
        <h1 style="margin:0 0 14px;color:#fbfaf5;font-size:26px;line-height:1.2;font-family:Georgia,serif;">' . sprintf(e($t['h1']), e($company)) . '</h1>
        <p style="margin:0 0 6px;color:#9fb1c7;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">' . sprintf($t['ref'], e($submissionId), e($validUntil)) . '</p>
        <p style="margin:0 0 20px;color:#d9e5f2;font-size:15px;line-height:1.7;">' . sprintf($t['intro'], e($quote['tier'])) . '</p>
        ' . render_quote_lines($quote['lines']) . '
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">
          <tr><td style="padding:10px 0;color:#9fb1c7;font-size:13px;">' . e($t['estimate']) . '</td><td style="padding:10px 0;color:#fbfaf5;font-size:16px;font-weight:800;text-align:right;">' . e($rangeLabel) . '</td></tr>
          <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,.08);color:#9fb1c7;font-size:13px;">' . e($t['maintenance']) . '</td><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,.08);color:#7dd3fc;font-size:14px;font-weight:700;text-align:right;">' . e(money($quote['maintenance'])) . ' ' . e($t['perMonth']) . '</td></tr>
        </table>
        <div style="margin:10px 0 8px;">
            ' . render_button($whatsappConfirm, $t['confirm'], '#22c55e') . '
            ' . render_button('mailto:' . DEVIS_FROM_EMAIL . '?subject=' . rawurlencode(sprintf($t['questionSubject'], $submissionId)), $t['question'], '#38bdf8') . '
        </div>
        <h2 style="margin:28px 0 12px;color:#fbfaf5;font-size:17px;">' . e($t['summary']) . '</h2>
        ' . render_info_table($rows) . '
        <p style="margin:22px 0 0;color:#9fb1c7;font-size:13px;line-height:1.7;">' . $t['footer'] . '</p>
    ';

    return render_email_shell($t['preheader'], $content, $lang);
}

function render_admin_email(string $submissionId, string $submittedAt, string $sourceUrl, string $remoteAddress, array $quote, array $adminQuoteLines, array $rows, string $phone): string
{
    $adminRows = $rows + [
        'Reference' => $submissionId,
        'Recu le' => $submittedAt,
        'Page source' => $sourceUrl,
        'Adresse IP' => $remoteAddress,
        'Formule recommandee' => $quote['tier'],
        'Estimation' => $quote['rangeMax'] > 0 ? money($quote['rangeMin']) . ' - ' . money($quote['rangeMax']) : 'a partir de ' . money($quote['rangeMin']),
    ];
    $leadWhatsapp = whatsapp_url_from_input($phone, 'Bonjour, je vous recontacte suite a votre demande de devis ' . $submissionId . '.');
    $whatsappButton = $leadWhatsapp !== '' ? render_button($leadWhatsapp, 'Contacter sur WhatsApp', '#22c55e') : '';

    $content = '
        <h1 style="margin:0 0 14px;color:#fbfaf5;font-size:26px;line-height:1.2;font-family:Georgia,serif;">Nouvelle demande de devis — ' . e($submissionId) . '</h1>
        ' . render_quote_lines($adminQuoteLines) . '
        ' . render_info_table($adminRows) . '
        <div style="margin:24px 0 0;">
            ' . render_button('mailto:' . (string) $rows['Email'], 'Repondre par email', '#38bdf8') . '
            ' . $whatsappButton . '
        </div>
    ';

    return render_email_shell('Nouvelle demande de devis automatisation', $content);
}

function render_email_shell(string $preheader, string $content, string $lang = 'fr'): string
{
    return '<!doctype html>
<html lang="' . e($lang) . '">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jack Brayan — Automatisation</title>
</head>
<body style="margin:0;padding:0;background:#080d16;font-family:Inter,Arial,sans-serif;color:#fbfaf5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . e($preheader) . '</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080d16;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:34px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:separate;">
          <tr>
            <td style="padding:0 0 18px;text-align:center;">
              <img src="' . e(LOGO_URL) . '" width="74" height="74" alt="Jack Brayan" style="display:inline-block;border-radius:50%;border:1px solid rgba(125,211,252,.45);box-shadow:0 14px 38px rgba(14,165,233,.24);">
              <div style="margin-top:12px;color:#7dd3fc;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">Automatisation &amp; Digitalisation</div>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1220;border:1px solid rgba(255,255,255,.10);border-radius:22px;padding:30px;box-shadow:0 24px 70px rgba(0,0,0,.35);">
              ' . $content . '
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;text-align:center;color:#78889f;font-size:12px;line-height:1.6;">
              Envoye par Jack Brayan depuis <a href="' . e(PAGE_URL) . '" style="color:#7dd3fc;text-decoration:none;">jackbrayan.com/automatisation</a><br>
              ' . e(DEVIS_FROM_EMAIL) . '
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function send_html_mail(string $to, string $subject, string $html, string $replyToEmail, string $replyToName): bool
{
    $replyToEmail = filter_var($replyToEmail, FILTER_VALIDATE_EMAIL) ? $replyToEmail : DEVIS_FROM_EMAIL;
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: ' . mailbox_header(DEVIS_FROM_NAME, DEVIS_FROM_EMAIL),
        'Reply-To: ' . mailbox_header($replyToName, $replyToEmail),
        'X-Mailer: PHP/' . phpversion(),
    ];

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headerString = implode("\r\n", $headers);

    if (DIRECTORY_SEPARATOR === '/') {
        return @mail($to, $encodedSubject, $html, $headerString, '-f' . DEVIS_FROM_EMAIL);
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

function json_response(int $status, bool $ok, string $message, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge(['ok' => $ok, 'message' => $message], $extra), JSON_UNESCAPED_SLASHES);
    exit;
}
