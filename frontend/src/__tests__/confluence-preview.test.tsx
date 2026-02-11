import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { ConfluencePreview } from "@/components/vex-converter/confluence-preview"

describe("ConfluencePreview", () => {
  it("renders headings", () => {
    const { container } = render(<ConfluencePreview markup="h1. Test Heading" />)
    const heading = container.querySelector("h1")
    expect(heading).toBeTruthy()
    expect(heading?.textContent).toBe("Test Heading")
  })

  it("renders bold text", () => {
    const { container } = render(<ConfluencePreview markup="*bold text*" />)
    const strong = container.querySelector("strong")
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toBe("bold text")
  })

  it("renders monospace text", () => {
    const { container } = render(<ConfluencePreview markup="{{code}}" />)
    const code = container.querySelector("code")
    expect(code).toBeTruthy()
    expect(code?.textContent).toBe("code")
  })

  it("renders tables", () => {
    const markup = "||Header1||Header2||\n|Cell1|Cell2|"
    const { container } = render(<ConfluencePreview markup={markup} />)
    const table = container.querySelector("table")
    expect(table).toBeTruthy()
    const ths = container.querySelectorAll("th")
    expect(ths).toHaveLength(2)
    const tds = container.querySelectorAll("td")
    expect(tds).toHaveLength(2)
  })

  it("renders horizontal rule", () => {
    const { container } = render(<ConfluencePreview markup="----" />)
    const hr = container.querySelector("hr")
    expect(hr).toBeTruthy()
  })

  it("renders status macros", () => {
    const { container } = render(
      <ConfluencePreview markup="{status:colour=red|title=Critical}" />,
    )
    const span = container.querySelector("span")
    expect(span?.textContent).toBe("Critical")
  })

  it("renders expand sections as details", () => {
    const markup = "{expand:title=Click me}\nHidden content\n{expand}"
    const { container } = render(<ConfluencePreview markup={markup} />)
    const details = container.querySelector("details")
    expect(details).toBeTruthy()
    const summary = container.querySelector("summary")
    expect(summary?.textContent).toBe("Click me")
  })

  it("renders panels", () => {
    const markup = "{panel:title=My Panel}\nPanel content\n{panel}"
    const { container } = render(<ConfluencePreview markup={markup} />)
    // Panel title should be present
    expect(container.textContent).toContain("My Panel")
    expect(container.textContent).toContain("Panel content")
  })

  it("escapes HTML in regular text", () => {
    const { container } = render(<ConfluencePreview markup="<script>alert(1)</script>" />)
    expect(container.innerHTML).not.toContain("<script>")
    expect(container.textContent).toContain("<script>")
  })
})
