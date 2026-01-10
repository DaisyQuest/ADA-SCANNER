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
<!-- Scenario: Navigation landmarks missing or misordered (NavigationStructureCheck) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<nav><ul><li><a href="#">Menu</a></li></ul></nav>
</main>
</div>
</body>
</html>
`;
