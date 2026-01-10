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
<!-- Scenario: Nested fieldsets missing legends (MissingFieldsetLegendCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<fieldset><input type="text"></fieldset>
</main>
</div>
</body>
</html>
`;
