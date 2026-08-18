<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>Sitemap · Marius Manolachi</title>
        <meta name="robots" content="noindex"/>
        <style>
          :root { color-scheme: dark; }
          body { margin: 0; background: #111111; color: #eceae4; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
          main { max-width: 920px; margin: 0 auto; padding: 48px 20px 72px; }
          h1 { margin: 0; font-size: 32px; letter-spacing: -.04em; }
          p { color: #a8a59c; }
          a { color: inherit; }
          table { width: 100%; border-collapse: collapse; margin-top: 28px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #2a2a2a; text-align: left; vertical-align: top; }
          th { color: #8d8a82; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
          td.date, td.count { white-space: nowrap; color: #a8a59c; font-variant-numeric: tabular-nums; }
        </style>
      </head>
      <body>
        <main>
          <h1>Sitemap</h1>
          <p>
            <xsl:value-of select="count(sm:urlset/sm:url)"/> pages for
            <a href="https://mariusmanolachi.com">mariusmanolachi.com</a>.
            Search engines read the raw XML. This page is only a human view.
          </p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Updated</th>
                <th>Images</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sm:urlset/sm:url">
                <tr>
                  <td><a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a></td>
                  <td class="date"><xsl:value-of select="sm:lastmod"/></td>
                  <td class="count"><xsl:value-of select="count(image:image)"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
