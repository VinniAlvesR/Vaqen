import { del, put } from "@vercel/blob"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerEnv } from "@/lib/env"
import { unauthorized } from "@/lib/api"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getUserIdFromRequest } from "@/services/auth"

export const runtime = "nodejs"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"])
const maxSize = 2 * 1024 * 1024
const localAvatarPrefix = "/uploads/avatars/"

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "upload", userId)
  if (limited) return limited

  const formData = await request.formData()
  const file = formData.get("image")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Envie uma imagem valida." } }, { status: 400 })
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: { code: "INVALID_FILE_TYPE", message: "Use uma imagem JPG, PNG ou WebP." } }, { status: 400 })
  }

  if (file.size > maxSize) {
    return NextResponse.json({ error: { code: "FILE_TOO_LARGE", message: "A imagem deve ter no maximo 2 MB." } }, { status: 400 })
  }

  const extension = getExtension(file.type, file.name)
  if (!allowedExtensions.has(extension)) {
    return NextResponse.json({ error: { code: "INVALID_FILE_TYPE", message: "Extensao de imagem invalida." } }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  if (!hasValidImageSignature(file.type, bytes)) {
    return NextResponse.json({ error: { code: "INVALID_FILE_SIGNATURE", message: "Arquivo de imagem invalido." } }, { status: 400 })
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
  if (!currentUser) return unauthorized()

  const env = getServerEnv()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "avatar"
  let imageUrl: string

  if (env.BLOB_READ_WRITE_TOKEN) {
    const pathname = `avatars/${userId}/${Date.now()}-${safeName}`
    const blob = await put(pathname, new Blob([bytes], { type: file.type }), {
      access: "public",
      contentType: file.type,
      token: env.BLOB_READ_WRITE_TOKEN,
    })
    imageUrl = blob.url
  } else if (env.NODE_ENV !== "production") {
    imageUrl = await saveLocalAvatar(userId, safeName, extension, bytes)
  } else {
    return NextResponse.json({ error: { code: "UPLOAD_NOT_CONFIGURED", message: "Upload de foto nao configurado no servidor." } }, { status: 503 })
  }

  await prisma.user.update({ where: { id: userId }, data: { image: imageUrl } })
  await removePreviousAvatar(currentUser.image, env.BLOB_READ_WRITE_TOKEN)

  return NextResponse.json({ image: imageUrl })
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const limited = await enforceRateLimit(request, "upload", userId)
  if (limited) return limited

  const env = getServerEnv()
  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
  if (!currentUser) return unauthorized()

  await prisma.user.update({ where: { id: userId }, data: { image: null } })
  await removePreviousAvatar(currentUser.image, env.BLOB_READ_WRITE_TOKEN)

  return NextResponse.json({ success: true })
}

async function saveLocalAvatar(userId: string, fileName: string, extension: string, bytes: Buffer) {
  const finalName = `${Date.now()}-${fileName.replace(/\.[^.]+$/, "")}${extension}`
  const relativeDirectory = path.join("uploads", "avatars", userId)
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory)
  await mkdir(absoluteDirectory, { recursive: true })
  await writeFile(path.join(absoluteDirectory, finalName), bytes)
  return "/" + path.posix.join("uploads", "avatars", userId, finalName)
}

async function removePreviousAvatar(value: string | null, blobToken?: string) {
  if (!value) return

  if (blobToken && isVaqenBlobUrl(value)) {
    await del(value, { token: blobToken }).catch(() => null)
    return
  }

  if (value.startsWith(localAvatarPrefix)) {
    const root = path.join(process.cwd(), "public", "uploads", "avatars")
    const target = path.normalize(path.join(process.cwd(), "public", value))
    if (target.startsWith(root)) await unlink(target).catch(() => null)
  }
}

function getExtension(type: string, fileName: string) {
  const lower = fileName.toLowerCase()
  const match = lower.match(/.[a-z0-9]+$/)
  if (match?.[0]) return type === "image/jpeg" && match[0] === ".jpeg" ? ".jpeg" : match[0]
  if (type === "image/jpeg") return ".jpg"
  if (type === "image/png") return ".png"
  if (type === "image/webp") return ".webp"
  return ""
}

function hasValidImageSignature(type: string, bytes: Buffer) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
  return false
}

function isVaqenBlobUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.includes("blob.vercel-storage.com")
  } catch {
    return false
  }
}
