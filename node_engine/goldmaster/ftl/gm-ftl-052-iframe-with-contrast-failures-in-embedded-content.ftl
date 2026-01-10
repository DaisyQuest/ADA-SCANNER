<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GoldMaster Case</title>
<style>
.hidden{display:none;} .nowrap{white-space:nowrap;} .fixed{width:1200px;}
</style>
</head>
<body>
<!-- Scenario: Iframe with contrast failures in embedded content (InsufficientContrastCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<iframe srcdoc="<p>Inner frame</p>"></iframe>
<p style="color:#777;background:#888;">Low contrast</p>
</main>
</div>
</body>
</html>