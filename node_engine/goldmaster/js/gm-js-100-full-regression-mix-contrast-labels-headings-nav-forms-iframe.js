screen.orientation.lock("portrait");
setTimeout(() => {}, 1000);

const template = `
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
<!-- Scenario: Full regression mix: contrast + labels + headings + nav + forms + iframe (Combo) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<iframe srcdoc="<p>Inner frame</p>"></iframe>
<input type="text" id="name">
<p style="color:#777;background:#888;">Low contrast</p>
<iframe srcdoc="<p>Combo frame</p>"></iframe>
<p style="color:#777;background:#888;">Combo contrast</p>
<input type="text">
</main>
</div>
</body>
</html>
`;
