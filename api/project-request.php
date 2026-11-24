<?php
declare(strict_types=1);
require_once __DIR__ . '/jb-core.php';
if(($_SERVER['REQUEST_METHOD']??'GET')!=='POST') jb_json(405,['ok'=>false,'message'=>'Method not allowed.']);
$d=jb_payload();
if(jb_clean($d['website']??'')!=='') jb_json(200,['ok'=>true]);
$name=jb_clean($d['name']??'',150);$email=jb_clean($d['email']??'',180);$type=jb_clean($d['type']??'',100);$message=jb_clean($d['message']??'',4000);
if($name===''||$type===''||$message===''||!filter_var($email,FILTER_VALIDATE_EMAIL)) jb_json(422,['ok'=>false,'message'=>'Please complete all required fields.']);
$ref=jb_store_lead(['service_type'=>'web_app','name'=>$name,'company'=>$d['business']??'','email'=>$email,'phone'=>$d['phone']??'','budget'=>$d['budget']??'','source'=>'sites_page','details'=>['type'=>$type,'platforms'=>$d['platforms']??'','features'=>$d['features']??'','timeline'=>$d['timeline']??'','message'=>$message]]);
@mail('hello@jackbrayan.com','New project request '.$ref,"Name: $name\nEmail: $email\nType: $type\n\n$message",'Reply-To: '.$email);
jb_json(200,['ok'=>true,'reference'=>$ref,'message'=>'Request received.']);
