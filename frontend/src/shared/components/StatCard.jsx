export function StatCard({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-white/80 mt-1">{label}</p>
    </div>
  );
}
