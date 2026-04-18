import db from "@/lib/db"




export async function GET() {
    const clients = db.prepare("SELECT * FROM clients").all()
    return Response.json(clients)
}
export async function POST(request: Request) {
    const body = await request.json()

   const result = db
    .prepare("INSERT INTO clients (name, email, company) VALUES (?, ?, ?)")
    .run(body.name, body.email, body.company)

        return Response.json({
            id: result.lastInsertRowid,
            ...body
        })
}

export async function DELETE(request: Request) {
    const { id } = await request.json()
    db.prepare("DELETE FROM clients WHERE id = ?").run(id)

    return Response.json({ succes: true })
}

export async function PUT(request: Request) {
  const { id, name, email, company } = await request.json()

  db.prepare(`
    UPDATE clients
    SET name = ?, email = ?, company = ?
    WHERE id = ?
  `).run(name, email, company, id)

  return Response.json({ id, name, email, company })
}