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
<!-- Scenario: Form label uses placeholder only (MissingLabelCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<input type="text" placeholder="Name">
</main>
</div>
</body>
</html>
`;
