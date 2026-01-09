<#ftl strip_whitespace=true>
<#assign sections = ["Overview", "Billing", "Support"] />

<#macro navItem label href="" description="">
  <li>
    <@link href="${href}" label="${label}" />
    <#if description?has_content>
      <span class="nav-description">${description}</span>
    </#if>
  </li>
</#macro>

<#macro iconButton label icon="" ariaLabel="">
  <@button label="${label}" <#if ariaLabel?has_content>aria-label="${ariaLabel}"</#if> />
  <#if icon?has_content>
    <span class="button-icon">${icon}</span>
  </#if>
</#macro>

<#macro panel title>
  <section class="panel">
    <h3>${title}</h3>
    <#nested>
  </section>
</#macro>

<@panel title="Account Summary">
  <ul class="nav-list">
    <#list sections as section>
      <@navItem label=section href="/${section?lower_case}" description="Go to ${section}" />
    </#list>
  </ul>

  <div class="actions">
    <@iconButton label="Edit" icon="✏️" ariaLabel="Edit account" />
    <@iconButton label="Delete" icon="🗑" />
  </div>

  <div class="media">
    <@img src="/images/account.png" alt="Account profile" />
    <@img src="/images/empty.png" />
  </div>

  <@iframe src="https://example.com/support" title="Support widget" />
</@panel>
