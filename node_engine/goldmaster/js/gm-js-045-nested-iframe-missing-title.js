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
<!-- Scenario: Nested iframe missing title (MissingIframeTitleCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<iframe srcdoc="<p>Inner frame</p>"></iframe>
<iframe srcdoc="<iframe srcdoc='Nested'></iframe>"></iframe>
</main>
</div>
</body>
</html>
`;
