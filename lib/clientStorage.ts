import { Client } from "@/types/client"
export function saveClients(clients : Client[]) {
    localStorage.setItem("clients", JSON.stringify(clients))
}

export function getClients(): Client[]{
    const saved = localStorage.getItem("clients")
    return saved ? JSON.parse(saved) : []
}