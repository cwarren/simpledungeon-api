import { app } from "./app.js";

const port = 3000;
//-------------------------

app.listen(port, () => {
    console.log(`simpledungeon-api listening at http://localhost:${port} inside the docker container`);
});

