import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getUserIdFromRequest } from "@/services/auth"

export const runtime = "nodejs"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxSize = 600 * 1024

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "upload", userId)
  if (limited) return limited

  const formData = await request.formData()
  const file = formData.get("image")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Envie uma imagem válida." } }, { status: 400 })
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: { code: "INVALID_FILE_TYPE", message: "Use uma imagem JPG, PNG ou WebP." } }, { status: 400 })
  }

  if (file.size > maxSize) {
    return NextResponse.json({ error: { code: "FILE_TOO_LARGE", message: "A imagem ficou grande demais. Tente outra foto." } }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  if (!hasValidImageSignature(file.type, bytes)) {
    return NextResponse.json({ error: { code: "INVALID_FILE_SIGNATURE", message: "Arquivo de imagem inválido." } }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return unauthorized()

  const image = `data:${file.type};base64,${bytes.toString("base64")}`
  await prisma.user.update({ where: { id: userId }, data: { image } })

  return NextResponse.json({ image })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "upload", userId)
  if (limited) return limited

  await prisma.user.update({ where: { id: userId }, data: { image: null } })

  return NextResponse.json({ success: true })
}

function hasValidImageSignature(type: string, bytes: Buffer) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
  return false
}
