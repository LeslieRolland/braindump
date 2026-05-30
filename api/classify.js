export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { text, spaces, categories } = req.body;

  const spaceList = spaces.map(p => {
    const cat = categories.find(c => c.id === p.category);
    const examples = p.tasks.slice(-3).map(t => t.text).join(", ");
    const hint = examples ? ` | tâches existantes: "${examples}"` : "";
    return `- id: ${p.id}, nom: "${p.name}", catégorie: ${cat?.label || p.category}${hint}`;
  }).join("\n");

  const prompt = `Tu es un assistant de productivité. Analyse ce texte et extrais les tâches.

Espaces disponibles:
${spaceList}

Catégories: ${categories.map(c => `${c.id} (${c.label})`).join(", ")}

Texte: "${text}"

Règles:
- PAR DÉFAUT : 1 prompt = 1 tâche. Regroupe en une phrase claire. Découpe SEULEMENT si l'utilisateur utilise une virgule entre deux actions distinctes, "+" / "et", OU un retour à la ligne — chaque ligne = une tâche distincte.
- MATCHING D'ESPACE :
  · BON MATCH : le sujet de la tâche correspond vraiment à l'espace → utilise cet espace
  · MAUVAIS MATCH : ne pas forcer, proposer un newSpace
  · Si les tâches existantes d'un espace ressemblent sémantiquement → utilise cet espace
- Si aucun espace ne correspond vraiment → mets spaceId à null et propose un newSpace générique
- Un newSpace doit être un DOMAINE LARGE, jamais la tâche elle-même
- PRIORITÉ : 1) "!" en fin = urgent  2) mots temporels ("ce soir","demain" = urgent, "lundi","semaine" = week)  3) déduction (vague = backlog)
- reminder: marqueur temporel précis ou null

Réponds UNIQUEMENT en JSON valide, sans markdown:
{
  "tasks": [{ "text": "tâche", "spaceId": "id ou null", "priority": "urgent|week|backlog", "reminder": "texte ou null" }],
  "newSpaces": [{ "name": "Nom large", "category": "id catégorie", "tasks": [{"text":"tâche","priority":"backlog","reminder":null}] }]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    const raw = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (parsed.tasks) parsed.tasks = parsed.tasks.map(t => ({ ...t, spaceId: t.spaceId || t.projectId || null }));
    if (parsed.newProjects) parsed.newSpaces = parsed.newSpaces || parsed.newProjects;
    res.json(parsed);
  } catch {
    res.status(500).json({ tasks: [], newSpaces: [] });
  }
}
