// Télécharge des données au format JSON
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Ouvre le sélecteur de fichier et transmet le contenu texte du fichier JSON choisi
export function pickJsonFile(onLoad: (content: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { onLoad(event.target?.result as string); };
    reader.readAsText(file);
  };
  input.click();
}
