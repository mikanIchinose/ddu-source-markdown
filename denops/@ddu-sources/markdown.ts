import {
  BaseSource,
  Context,
  Item,
} from "https://deno.land/x/ddu_vim@v1.11.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v1.11.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.3.1/file.ts";
import { parse } from "https://deno.land/std@0.159.0/path/mod.ts";
import {
  MarkdownRecord,
  toRecords,
} from "https://deno.land/x/markdown_records@0.2.0/mod.ts";

type Params = {
  style: "parent" | "hash" | "indent";
  chunkSize: number;
  limit: number;
};

type Args = {
  denops: Denops;
  context: Context;
  sourceParams: Params;
};

export class Source extends BaseSource<Params> {
  kind = "file";

  gather(
    { denops, context, sourceParams }: Args,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const bufNr = context.bufNr;
        const filePath = await fn.bufname(denops, bufNr);

        // Skip not markdown
        if (!parse(filePath).ext.includes("md")) return;

        const lines = await fn.getbufline(denops, bufNr, 1, "$");

        // Parse mardown
        const headerRecords = (await toRecords([...lines].join("\n")))
          .filter((line) => line.kind === "heading");

        let items: Item<ActionData>[] = [];
        const chunkSize = 5;
        for (let i = 0; i < lines.length; i++) {
          if (i >= sourceParams.limit) break;

          // Find header
          const header = headerRecords.find((record) => {
            return escapeRegex(lines[i]).includes(record.content);
          });
          if (!header) {
            continue;
          }

          // Create chunk
          const chunk: Item<ActionData> = {
            word: getStyledWord(header, sourceParams.style),
            action: {
              bufNr,
              lineNr: i + 1,
            },
            status: {
              size: i + 1,
            },
          };
          items.push(chunk);

          if (items.length >= chunkSize) {
            controller.enqueue(items);
            items = [];
          }
        }
        if (items.length) {
          controller.enqueue(items);
        }

        controller.close();
      },
    });
  }

  params(): Params {
    return {
      style: "hash",
      chunkSize: 5,
      limit: 1000,
    };
  }
}

const reRegExp = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExp = new RegExp(reRegExp.source);
const escapeRegex = (str: string): string => {
  return (str && reHasRegExp.test(str)) ? str.replace(reRegExp, "\\$&") : str;
};

const getStyledWord = (doc: MarkdownRecord, style: Params["style"]): string => {
  const level = doc.hierarchy.length + 1;
  if (style === "parent") {
    // parent-style
    doc.hierarchy.push(doc.content);
    return doc.hierarchy.join("/");
  } else if (style === "hash") {
    // hash-style
    return `${"#".repeat(level)} ${doc.content}`;
  } else if (style === "indent") {
    // indent-style
    const indent = "  ".repeat(level - 1);
    return `${indent}${doc.content}`;
  } else {
    return doc.content;
  }
};
