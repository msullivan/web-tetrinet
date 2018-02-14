export class MessagePane {
  messagesDiv: HTMLDivElement;
  scrolled: boolean;

  // Scrolling logic adapted from:
  // https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up

  constructor(messagesDiv: HTMLDivElement) {
    this.messagesDiv = messagesDiv;
    this.scrolled = false;

    messagesDiv.addEventListener('scroll', () => {
      this.scrolled = !(messagesDiv.scrollHeight - messagesDiv.clientHeight <=
                        messagesDiv.scrollTop + 1);
    });
  }

  addMessage = (msg: string) => {
    let nobe = document.createElement('div');
    nobe.innerHTML = msg;
    this.messagesDiv.appendChild(nobe);
    if (!this.scrolled) {
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }
  }

  clearMessages = () => {
    // Apparently this is the fastest thing? Though who really cares.
    this.messagesDiv.innerHTML = '';
    this.scrolled = false;
  }

}
