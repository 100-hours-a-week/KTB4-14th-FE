export function Progress({ step }: { step: number }) {
  return (
    <div className="progress">
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= step ? 'on' : ''} />
      ))}
    </div>
  );
}
