<#ftl strip_whitespace=true>
<#assign userName = "Ada" />
<#assign primaryUrl = "/dashboard" />

<#macro uiLink href label icon="">
  <a href="${href}" class="nav-link">
    <#if icon?has_content>
      <span class="icon">${icon}</span>
    </#if>
    ${label}
  </a>
</#macro>

<#macro uiButton label variant="primary" ariaLabel="">
  <button class="btn btn-${variant}" <#if ariaLabel?has_content>aria-label="${ariaLabel}"</#if>>
    ${label}
  </button>
</#macro>

<#macro uiCard title body>
  <section class="card">
    <h2>${title}</h2>
    <div class="card-body">${body}</div>
  </section>
</#macro>

<#macro uiIframe src title="">
  <@iframe src="${src}" <#if title?has_content>title="${title}"</#if> />
</#macro>

<main>
  <@link href="#main" label="Skip to main content" />
  <header>
    <h1>Welcome ${userName}</h1>
    <nav>
      <@uiLink href=primaryUrl label="Dashboard" icon="🏠" />
      <@uiLink href="/settings" label="Settings" />
      <@uiLink href="/reports" label="Reports" />
    </nav>
  </header>

  <section id="main">
    <@uiCard
      title="Quick Actions"
      body="${'<@button label=\"Create Report\" /> <@button label=\"Export\" />'}" />

    <div class="media">
      <@img src="/images/hero.png" alt="Hero banner" />
      <@img src="/images/badge.png" />
    </div>

    <@uiIframe src="https://example.com/embed" />

    <form>
      <label for="search">Search</label>
      <input id="search" type="search" />
      <@input type="submit" value="Go" />
    </form>

    <@uiButton label="Save changes" ariaLabel="Save" />
  </section>
</main>
