import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { FeedbackType } from "@/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { apiError, unauthorized } from "@/lib/api"
import { sendSystemEmail } from "@/lib/email"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getUserIdFromRequest } from "@/services/auth"

const SUPPORT_EMAIL = "vaqen.suporte@gmail.com"

const feedbackInput = z.object({
  type: z.enum(["PROBLEM", "SUGGESTION", "QUESTION", "PRAISE"]),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  message: z.string().trim().min(1).max(4000),
  pageUrl: z.string().trim().max(2048).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "write")
  if (limited) return limited

  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  try {
    const input = feedbackInput.parse(await request.json())
    const userAgent = request.headers.get("user-agent")
    const [feedback, user] = await prisma.$transaction([
      prisma.feedback.create({
        data: {
          userId,
          type: input.type as FeedbackType,
          rating: input.rating ?? null,
          message: input.message,
          pageUrl: input.pageUrl || null,
          userAgent,
        },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    ])

    try {
      await sendSystemEmail({
        to: SUPPORT_EMAIL,
        subject: `[Vaqen Beta] Novo feedback: ${labelType(input.type)}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a">
            <h1>Novo feedback recebido</h1>
            <p><strong>Tipo:</strong> ${escapeHtml(labelType(input.type))}</p>
            <p><strong>Nota:</strong> ${input.rating ?? "Não informada"}</p>
            <p><strong>Usuário:</strong> ${escapeHtml(user?.name ?? "Usuário")} &lt;${escapeHtml(user?.email ?? "sem email")}&gt;</p>
            <p><strong>Página:</strong> ${escapeHtml(input.pageUrl || "Não informada")}</p>
            <p><strong>User agent:</strong> ${escapeHtml(userAgent ?? "Não informado")}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
            <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(input.message)}</p>
            <p style="margin-top:24px;color:#64748b;font-size:13px">ID do feedback: ${feedback.id}</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Feedback salvo, mas o email de alerta falhou", emailError)
    }
    return NextResponse.json({
      success: true,
      feedback: { id: feedback.id, status: feedback.status, createdAt: feedback.createdAt },
      message: "Feedback enviado com sucesso. Obrigado por ajudar a melhorar o Vaqen.",
    }, { status: 201 })
  } catch (cause) {
    if (cause instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Preencha a mensagem do feedback corretamente." } },
        { status: 400 }
      )
    }
    return apiError(cause, "Não foi possível enviar o feedback")
  }
}

function labelType(type: string) {
  switch (type) {
    case "PROBLEM":
      return "Problema"
    case "SUGGESTION":
      return "Sugestão"
    case "QUESTION":
      return "Dúvida"
    case "PRAISE":
      return "Elogio"
    default:
      return "Feedback"
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}
