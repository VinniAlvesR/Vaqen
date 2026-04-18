type ClientCardProps ={
name: string
company:string
onDelete: () => void
onEdit: () => void
}
export default function ClientCard({name,company,onDelete,onEdit}:ClientCardProps){
    return (
        <div className="border rounded-lg p-2 shadow w-full">
            <h3>{name}</h3>
            <p>{company}</p>
            <button onClick={onDelete}
            className="text-red-600 ml-2"
            >Excluir</button>
             <button onClick={onEdit}
             className=" ml-2"
             >Editar</button>

        
        </div>
    )
}