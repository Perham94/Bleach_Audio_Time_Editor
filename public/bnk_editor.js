function uploadFile() {
    const fileInput = document.getElementById("fileInput").files[0];
    const songId = document.getElementById("songId").value;
    const newTime = document.getElementById("newTime").value;

    if (!fileInput || isNaN(songId) || isNaN(newTime)) {
        alert("Please provide a valid file and values.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput);
    formData.append("songId", songId);
    formData.append("newTime", newTime);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (response.ok) return response.blob();
        throw new Error("File processing failed.");
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileInput.name.replace(".bnk", "_modified.bnk");
        a.click();
        document.getElementById("output").textContent = "File processed and downloaded.";
    })
    .catch(err => {
        document.getElementById("output").textContent = err.message;
    });
}
