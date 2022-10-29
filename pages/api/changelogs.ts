import fs from 'fs'
import path from 'path'

export default function handler(req, res){
  const dirRelativeToPublicFolder = './versions'

  const dir = path.resolve('./public', dirRelativeToPublicFolder);

  const filenames = fs.readdirSync(dir);
  // const dir = path.resolve('./versions', '');
  // const filenames = fs.readdirSync(dir);

  // read contents from file as string
  const changelogs = filenames.map(filename => {
    const filepath: string = path.resolve(dir, filename);
    const version = filename.match(/\d+\.\d+\.\d+/)[0];
    const title = filename.split('_').reduce((acc, curr) => {
      if(curr == version) return acc;
      const word = curr.split('.')[0];
      return acc + word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + ' ';
    }, '').trim();

    const fileContents = fs.readFileSync(filepath, 'utf8');
    const lines = fileContents.split('\n').map(line => line.trim());
	const changes = {"Major": [],"Minor": []}
	lines.forEach(function (item, index) {
		if (item.indexOf("+") === 0) {
			item = item.replace("+","");
			changes['Major'].push(item.trim())
		} else if (item.indexOf("-") === 0) {
			item = item.replace("-","");
			changes['Minor'].push(item.trim())
		}
	});
    return {
      version: version,
      name: title,
      content: changes
    }
  });

  const sortVersions = changelogs.sort((a, b) => {
    let aVal = a.version.split('.').map(Number)
    let bVal = b.version.split('.').map(Number)
    for (let i = 0; i < aVal.length; i++) {
      if (aVal[i] > bVal[i]) return -1;
      if (aVal[i] < bVal[i]) return 1;
    }
    return 0;
  })
  res.statusCode = 200
  res.json(sortVersions);
}