type CardProps = {
    title: string
    value: string
}
export default function Card({ title, value }: CardProps) {
    return (
        <div className="border rounded-lg p-4 shadow w-full">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    )
}