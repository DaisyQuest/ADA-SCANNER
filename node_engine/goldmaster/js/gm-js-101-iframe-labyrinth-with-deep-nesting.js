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
.level-0,.level-1,.level-2,.level-3,.level-4,.level-5,.level-6,.level-7,.level-8,.level-9,.level-10{padding:2px;}
</style>
</head>
<body>
<!-- Scenario: Iframe labyrinth with deep nesting and form errors (MissingIframeTitleCheck, MissingLabelCheck, DuplicateIdCheck) -->
<a class="skip" href="#main">Skip to main</a>
<div class="level-0"><div class="level-1"><div class="level-2"><div class="level-3"><div class="level-4"><div class="level-5"><div class="level-6"><div class="level-7"><div class="level-8"><div class="level-9"><div class="level-10">
<main id="main">
<h1>GoldMaster Case</h1>
<section aria-label="Billing">
<h2>Billing Details</h2>
<form>
<label>Email address</label>
<input type="email" id="account" name="account">
<input type="text" id="account" name="account-confirm">
</form>
</section>
<section class="nowrap">
<h2>Embedded Help</h2>
<iframe srcdoc='<!doctype html><html lang="en"><body><p>Frame level 1</p><iframe srcdoc="<p>Frame level 2</p>"></iframe></body></html>'></iframe>
<iframe title="" srcdoc="<p>Inline guidance</p>"></iframe>
</section>
</main>
</div></div></div></div></div></div></div></div></div></div></div>
</body>
</html>
`;
