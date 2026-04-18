import Card from "@/components/Card"

export default function DashboardPage() {
    return (
        <main className="p-6">
            <div>
                <h1>Bem-vindo ao FlowDesk</h1>
                <p>Gerencie seus clientes, projetos e tarefas</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card title="Clientes" value="0" />
                <Card title="Projetos" value="0" />
                <Card title="Tarefas" value="0" />
            </div>
        </main>
    )
}