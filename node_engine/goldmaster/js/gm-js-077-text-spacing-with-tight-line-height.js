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
<!-- Scenario: Text spacing with tight line-height (TextSpacingCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<p style="line-height:1;letter-spacing:-0.5px">Tight spacing</p>
</main>
</div>
</body>
</html>
`;
