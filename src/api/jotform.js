const BASE = 'https://api.jotform.com';

function mapAnswers(answers, questions) {
  const out = {};
  for (const qid in answers) {
    const name = questions[qid]?.name || qid;
    const val = answers[qid]?.answer ?? answers[qid];
    if (val != null && val !== '') out[name] = val;
  }
  return out;
}

export async function fetchFormData({ id, key }) {
  const [qRes, sRes] = await Promise.all([
    fetch(`${BASE}/form/${id}/questions?apiKey=${key}`).then(r => r.json()),
    fetch(`${BASE}/form/${id}/submissions?apiKey=${key}&limit=100&orderby=created_at,DESC`).then(r => r.json()),
  ]);
  const questions = qRes.content || {};
  const submissions = sRes.content || [];
  return submissions.map(sub => ({
    ...mapAnswers(sub.answers || {}, questions),
    _id: sub.id,
    _created: sub.created_at,
  }));
}
