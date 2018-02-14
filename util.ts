export function randInt(num: number): number {
  return Math.floor(Math.random() * num);
}

// From http://shebang.brandonmintern.com/foolproof-html-escaping-in-javascript/
export function escapeHtml(str: string): string {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
