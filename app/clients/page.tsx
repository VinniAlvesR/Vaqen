"use client" // permite usar useState (React hooks)

import { useState, useEffect } from "react"
import ClientCard from "@/components/ClientCard"
import { Client } from "@/types/client"



export default function ClientsPage() {

    // Estado da lista de clientes (dados do sistema)
    const [clients, setClients] = useState<Client[]>([])

    // Estados dos inputs (formulário)
    const [name, setName] = useState("")
    const [company, setCompany] = useState("")
    const [email, setEmail] = useState("")

    // controla se o formulário aparece ou não
    const [showForm, setShowForm] = useState(false)

    const [editingClient, setEditingClient] = useState<Client | null>(null)

    // função chamada ao clicar em "Salvar"
    
        
  async function handleAddClient() {

        // validação simples (não deixa salvar vazio)
        if (!name || !company || !email)  return
        
        const response = await fetch("/api/clients", {
            method: "POST",
            headers: {
                "content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                company

            })
        })

        // cria um novo cliente
        const newClient = await response.json()

        // adiciona o novo cliente na lista existente
        setClients((prev) => [...prev,newClient])

        // limpa os inputs
        setName("")
        setCompany("")
        setEmail("")

        // fecha o formulário
        setShowForm(false)

        // feedback para o usuário
        alert("Cliente criado com sucesso")
    }

     async function handleDeleteClient(id: number) {
        await fetch("/api/clients", {
            method: "DELETE",
            headers:{
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
        })
        setClients((prev) => prev.filter((client) => client.id !== id))

    }

    function handleEditClient(client: Client) {
        setName(client.name)
        setEmail(client.email)
        setCompany(client.company)

        setEditingClient(client)
        setShowForm(true)
    }

    async function handleUpdateClient() {
       if (!editingClient) return

       const response = await fetch("/api/clients", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: editingClient.id,
            name,
            email,
            company
        })
       })

       const updated = await response.json()

       setClients((prev) =>
        prev.map((client) =>
            client.id === updated.id ? updated :client
        )
    )

        setEditingClient(null)
        setName("")
        setEmail("")
        setCompany("")
        setShowForm(false)
    }

    async function fetchClients(){
    const response = await fetch("api/clients")
    const data = await response.json()

    setClients(data)
    }

    useEffect(() => {
        async function load(){
            await fetchClients()
        }

        load()
    },[])

    return (
        <main className="p-6">

            <h1>Clientes</h1>

            {/* 🔹 botão para abrir o formulário */}
            <button
                onClick={() => setShowForm(!showForm)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
                + Novo cliente
            </button>

            {/* 🔹 renderização condicional (mostra só se showForm for true) */}
            {showForm && (
                <div className="mt-4 border p-4 rounded">

                    {/* 🔹 input nome */}
                    <input
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    {/* 🔹 input email */}
                    <input
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* 🔹 input empresa */}
                    <input
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Empresa"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                    />
                    <div>
                        <button onClick={editingClient ? handleUpdateClient : handleAddClient}>
                            Salvar
                        </button>

                        <button onClick={() => setShowForm(false)}
                            className="ml-2 bg-gray-400 text-white px-4 py-2 rounded"
                        >Cancelar</button>
                    </div>
                </div>
            )}

            {/* 🔹 lista de clientes */}
            <div className="mt-8">
                {clients.map((client) => (
                    <ClientCard
                        key={client.id} // obrigatório no React
                        name={client.name}
                        company={client.company}
                        onDelete={() => handleDeleteClient(client.id)}
                        onEdit={() => handleEditClient(client)}
                    />
                ))}
            </div>
        </main>
    )
}