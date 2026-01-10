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
<!-- Scenario: Text resize at 200% clips content (TextResizeCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<div style="font-size:10px;">Small text</div>
</main>
</div>
</body>
</html>
`;
