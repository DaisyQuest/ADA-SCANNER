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
button:focus{outline:none;}
</style>
</head>
<body>
<!-- Scenario: Focus indicator insufficient contrast (FocusVisibleCheck + InsufficientContrastCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<p style="color:#777;background:#888;">Low contrast</p>
</main>
</div>
</body>
</html>
`;
