# Repository operating rules

Use this engineering sequence:

1. Question and clarify the requirement.
2. Delete unnecessary steps or parts.
3. Simplify before optimizing.
4. Accelerate the simplified workflow.
5. Automate only after the workflow is correct.

## Blog publication safety

- Never manually commit or push generated blog posts, blog images, or other publication artifacts.
- Only the Content Studio scheduler may commit and push files under `content/blog/` or `public/blog/`. It must do so through its publishing workflow, which enforces the configured daily publication count.
- For unrelated code or website changes, stage only explicit file paths. Never use broad staging commands that could include generated blog content.
- Before every non-scheduler commit, inspect the staged file list and staged diff. Abort the commit if it includes a blog post or blog asset.
- Ready and in-progress blog artifacts must remain local and queued until the scheduler selects them for publication.
