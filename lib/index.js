/* 主要处理方法 */
let fs = require('fs'),
    download = require('download'),
    decompress = require('decompress'),
    { spawn } = require('child_process'),
    color = require('colors'),
    [timeCounter, timer] = [0, null];

/**
 * 定义所有静态变量
 * @param {{
 * LIST_TYPE 查看version列表信息
 * THEME_TYPE 安装指定版本的主题库
 * VERSION 查看版本库的GitHub 库名字
 * MASTER master分支，最新版本
 * TEMP_DIR 下载后的文件暂时存储的地方
 * }}
 */
const [LIST_TYPE, THEME_TYPE, VERSION, MASTER, TEMP_DIR, CNPM_INS, NPM_INS] = [
    'version',
    'theme',
    'lensyn-version',
    'master',
    './lensyn-temp',
    'cnpm install',
    `npm install`
];

const Theme = {
    init(args) {
        /* 重新组装并解析参数 */
        let user = args.user,
            list = args.list,
            version = args.install;
        /* 如果是list类型需要下载lensyn-version 库并进行解析展示 */
        if (list) {
            downloadZipFile(LIST_TYPE, user, VERSION, MASTER);
        }
        /* 如果是install类型需要下载指定theme和版本，如果版本未指定则设置为master最新版本 */
        if (version) {
            downloadZipFile(THEME_TYPE, user, version[0], version[1] ? version[1] : MASTER);
        }
    }
}

/* 下载制定GitHub zip文件 */
async function downloadZipFile(...args) {
    /* 重新定义参数 */
    let [type, user, tplName, version] = args;

    /* 下载提示 */
    console.log(`Begin download the ${version} version of the ${tplName} theme template dicrionary ...`);

    /* 拼装下载路径 */
    let verCode = version === MASTER ? MASTER : `v${version}`;
    let url = `https://github.com/${user}/${tplName}/archive/${verCode}.zip`;

    /* 下载文件并try捕获异常提示用户 */
    try {
        /* 如果不存在文件则进行创建文件夹，并下载文件 */
        if (!fs.existsSync) fs.mkdirSync(TEMP_DIR);

        timerFunc('start', 'Loading ... ...');
        await download(url, TEMP_DIR)
            .then(() => {
                console.log(`The ${version} version of the ${tplName} theme template has downloaded`);
            });

        timerFunc('close');
        /* 根据不同类型解压到不同位置 */
        let distPath = type === LIST_TYPE ? TEMP_DIR : ".";

        await decompress(`${TEMP_DIR}/${tplName}-${verCode.replace(/^(v)?(V)?/, '')}.zip`, distPath)
            .then(files => {
                if (type === LIST_TYPE) {

                    /* 文件下载成功提示 */
                    console.log('Decompress dicrionary success');

                    /* 遍历所有文件找到对应的version.json 文件，并读取内容展示列表信息 */
                    files.map(it => {

                        /* 读取文件的时候需要根据文件位置重新设值路径 */
                        if (it.path.indexOf("version.json") > -1) showVersionInfo(`${TEMP_DIR}/${it.path}`);
                    });
                }
                if (type === THEME_TYPE) {
                    /* 文件下载成功提示 */
                    console.log('Theme dicrionary downloaded success');

                    /* 删除临时文件 */
                    removeDir(TEMP_DIR);

                    /* 执行安装 */
                    let nowPath = `./${tplName}-${verCode.replace(/^(v)?(V)?/, '')}`;
                    execInstall('cnpm', nowPath);
                }
            });
    } catch (e) {
        console.log(`The ${version} version of the ${tplName} theme template does not exist`);
    }
}

/* 超时方法 */
function timerFunc(type, str) {
    if (type === 'start') {
        type = 'loading';
        timeCounter = 0;
    }
    if (type === 'loading') {
        timer = setTimeout(() => {
            timeCounter += 100;
            console.log(`${str}` ['green'], `${timeCounter/1000}s` ['red']);
            timerFunc(type, str);
        }, 100);
    } else {
        if (timer) clearTimeout(timer);
        timer = null;
    }
}

function execInstall(command, path) {

    /* 开始执行install命令 */
    timerFunc('start', 'Installation dependency  ... ...');
    console.log(process.platform, 'now platform version');
    let cp = spawn(`${command}` + (process.platform === 'win32' ? '.cmd' : ''), [`install`], { cwd: path });

    /* 正常输出 */
    cp.stdout.on('data', data => {
        timerFunc('close');
        console.log(`Install stdout: ${data}`);
    });

    /* 错误输出 */
    cp.stderr.on('data', data => {
        timerFunc('close');
        console.log(`Install stderr: ${data}`);
    });

    /* 关闭输出 */
    cp.on('close', code => {

        /* 如果是没有安装cnpm则执行npm安装命令 */
        if (command === 'cnpm' && code !== 0) {
            execInstall('npm', nowPath);
        } else {
            console.log(`Install process finished width code ${code}`);
        }
    });
}

async function showVersionInfo(path) {
    /* 读取本地json数据 */
    let file = await fs.readFileSync(path);
    if (!file) {
        console.log('can\'t read version file');
        return false;
    }

    /* 读取json文件 */
    let txt = JSON.parse(file.toString());;

    /* 信息输出区域 */
    console.log(`/**********************************************************************/\n`);
    txt.map(item => {
        /* 显示主题名字 */
        console.info(`Theme Name: ${item['theme-name']}` ['red', 'bgCyan']);
        item['version-list'].map(it => {
            /* 显示主题版本和主题描述 */
            console.info(`${item['theme-name']}@${it['item-name']}` ['green']);
            console.info(`${it['item-desc']}` ['green']);
            console.log('------------------------------------------------------------------------');
        });
    });
    console.log(`/**********************************************************************/`);

    /* 删除临时目录 */
    removeDir(TEMP_DIR);
}

/* 删除临时目录文件 */
async function removeDir(path) {
    var files = [];
    /* 如果存在文件，读取文件 */
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        /* 遍历所有文件 */
        files.forEach(function(file, index) {
            var curPath = path + "/" + file;
            /* 如果是文件夹，则递归删除，否则直接删除文件 */
            if (fs.statSync(curPath).isDirectory()) {
                removeDir(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        /* 删除主目录 */
        fs.rmdirSync(path);
    }
};

module.exports = Theme;