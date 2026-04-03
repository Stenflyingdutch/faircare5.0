export function InfoBlock({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="info-block">
      <h3>{heading}</h3>
      <p>{text}</p>
    </div>
  );
}
