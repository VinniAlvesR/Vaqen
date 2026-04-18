import Link from "next/link"
export default function Navbar(){
    return (
        <nav className="flex justify-between p-4 border-b">
            <h1>FlowDesk</h1>
            <div className="flex gap-4">
                <Link href="/dashboard">Dashboard</Link> <br />
                <Link href="/clients">Clientes</Link>
            </div>
        </nav>
    )
}