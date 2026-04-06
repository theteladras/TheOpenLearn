import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseLessonHandbookDoc } from "@/server/ai/lesson-handbook-schema";
import { lessonHandbookToPdfBuffer } from "@/server/handbook/render-lesson-handbook-pdf";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function asciiFilenamePart(raw: string): string {
  const s = raw
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return s || "lesson-handbook";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { taskId } = await context.params;
  const user = await getOrCreateAppUser();

  const row = await prisma.lessonHandbook.findFirst({
    where: {
      userId: user.id,
      taskId,
      task: { phase: { roadmap: { userId: user.id } } },
    },
    include: { task: { select: { title: true } } },
  });

  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  let doc;
  try {
    doc = parseLessonHandbookDoc(row.handbookJson);
  } catch {
    return new NextResponse("Handbook data invalid", { status: 500 });
  }

  const footer = `The Open Learn · generated ${row.createdAt.toISOString().slice(0, 10)}`;

  let buffer: Buffer;
  try {
    buffer = await lessonHandbookToPdfBuffer(doc, footer);
  } catch (e) {
    console.error("lesson handbook PDF", e);
    return new NextResponse("PDF render failed", { status: 500 });
  }

  const fname = `${asciiFilenamePart(row.task.title)}-handbook.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
