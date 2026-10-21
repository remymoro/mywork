import { parseMarkdown, type MarkdownInline } from "@/lib/kanban";

function Inline({ nodes }: { nodes: MarkdownInline[] }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "strong":
        return <strong key={index}>{node.text}</strong>;
      case "emphasis":
        return <em key={index}>{node.text}</em>;
      case "link":
        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {node.text}
          </a>
        );
      default:
        return node.text;
    }
  });
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 break-words text-sm leading-relaxed">
      {parseMarkdown(text).map((node, index) => {
        if (node.type === "heading") {
          return (
            <h3 key={index} className="font-heading text-xl font-medium">
              <Inline nodes={node.children} />
            </h3>
          );
        }
        if (node.type === "paragraph") {
          return (
            <p key={index} className="whitespace-pre-wrap">
              <Inline nodes={node.children} />
            </p>
          );
        }
        const List = node.type === "bullet-list" ? "ul" : "ol";
        return (
          <List
            key={index}
            className={`${node.type === "bullet-list" ? "list-disc" : "list-decimal"} space-y-1 pl-5`}
          >
            {node.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inline nodes={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
