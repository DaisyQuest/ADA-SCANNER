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
<!-- Scenario: Deep nesting with 5 iframes and 10 subforms (Combo) -->
<div id="content">
<main id="main">
<h1>GoldMaster Case</h1>
<iframe srcdoc="<p>Inner frame</p>"></iframe>
<div class="level-0"><div class="level-1"><div class="level-2"><div class="level-3"><div class="level-4"><div class="level-5"><div class="level-6"><div class="level-7"><div class="level-8"><div class="level-9"><div class="level-10"><div class="level-11"><div class="level-12"><div class="level-13"><div class="level-14"><div class="level-15"><div class="level-16"><div class="level-17"><div class="level-18"><div class="level-19">Deep content</div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div>
<iframe srcdoc="<p>Combo frame</p>"></iframe>
<p style="color:#777;background:#888;">Combo contrast</p>
<input type="text">
</main>
</div>
</body>
</html>
`;
