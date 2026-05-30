export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { spaces, categories } = req.body;

  const all = spaces.flatMap(p => p.tasks.filter(t => !t.done).map(t => ({
    id: t.id, text: t.text, priority: t.priority, reminder: t.reminder, createdAt: t.createdAt,
    spaceName: p.name, spaceId: p.id, spaceCategory: p.category,
  })));

  if (!all.length) return res.json([]);

  const prompt = `Choisis les 3 meilleures tâches à faire aujourd'hui.
Tâches: ${JSON.stringify(all)}
Date: ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
Critères: 1) rappels proches 2) urgent 3) week en fin de semaine 4) tâches qui traînent 5) équilibre pro/perso 6) jamais 3 du même espace
Réponds UNIQUEMENT en JSON: { "focus": [{ "id": "...", "reason": "max 10 mots" }] }`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    const result = JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim());
    const focus = (result.focus || []).map(f => { const t = all.find(x => x.id === f.id); return t ? { ...t, reason: f.reason } : null; }).filter(Boolean);
    res.json(focus);
  } catch {
    const fallback = [...all.filter(t => t.priority === "urgent").slice(0, 2), ...all.filter(t => t.priority === "week").slice(0, 1)].slice(0, 3);
    res.json(fallback);
  }
}
