import fs from 'node:fs';

// Inserts the v0_8_1 block just before v0_7_28 in every locale, so the newest release reads first.
// 0.8.1 is what put upstream 0.7.28's work into this fork for real: the version marker had been
// left at 0.7.28, so none of this ever reached a listener through the in-app intro.
const BLOCKS = {
    'zh-CN': `    "v0_8_1": {
      "intro": "这次把上游 0.7.28 的内容真正接了进来：新歌词样式、影厅场景、窗口按钮位置，加上一批玻璃与图标的修复。",
      "scenes": {
        "title": "场景：影厅（Beta）",
        "description": "播放页可以变成一座影厅，你的歌词样式和背景放在荧幕上，可以拖动转头看看四周。在外观页的「场景」一行打开。桌面版还能开「声线追踪」，让音乐听起来像在厅里。返回键固定在整页左上角，不再跟着歌词样式跑到银幕上。"
      },
      "newLook": {
        "title": "新图标与平台标识",
        "description": "新的应用图标：四块积木拼成的 F。九个音乐平台都用各自的真实应用图标，登录按钮、平台切换器和账号页一致。"
      },
      "windowControls": {
        "title": "窗口按钮",
        "description": "窗口按钮可以放到左边或右边。macOS 可以改用系统自带的红绿灯，Dock 菜单里也能控制播放。从托盘恢复窗口、最小化时，任务栏缩略图上的播放按钮都会照常更新。"
      },
      "styleOptions": {
        "title": "歌词样式新选项",
        "description": "莫奈可以左右镜像、关闭肖像、自定义描述。时计的表盘可以倾斜、分层，还有轮心视角。回环可以调位置，并沿圆环显示翻译。"
      },
      "glassFixes": {
        "title": "玻璃与可读性",
        "description": "导航、搜索、底部播放条、正在播放卡和登录按钮的液态玻璃都补回来了。搜索框不再跟着输入流动；导航条保持静止。玻璃边缘在高缩放屏幕上不再有锯齿；浅色壁纸上的导航与搜索文字也看得清了。"
      }
    },
`,
    en: `    "v0_8_1": {
      "intro": "This release brings upstream 0.7.28 in for real: new lyric styles, the cinema scene, window control placement, and a round of glass and icon fixes.",
      "scenes": {
        "title": "Scenes: cinema (beta)",
        "description": "The playback page can become a cinema, with your lyric style and background on the screen; drag to look around. Open it from the Scenes row on the appearance page. The desktop app can also trace sound through the room. The back button now sits at the page's top-left corner instead of following the lyric style onto the screen."
      },
      "newLook": {
        "title": "New icon and platform marks",
        "description": "A new app icon: an F built from four blocks. All nine music providers show their own real app icon, the same one on the sign-in button, the provider switcher and the account page."
      },
      "windowControls": {
        "title": "Window controls",
        "description": "Window buttons can sit on the left or the right. On macOS the system traffic lights can take over, and the Dock menu controls playback. Restoring from the tray and minimising now both keep the taskbar thumbnail's playback buttons up to date."
      },
      "styleOptions": {
        "title": "New lyric style options",
        "description": "Monet can mirror, drop its portrait and take a custom description. The clock's dial can tilt and layer, and gains a hub view. The loop can be moved and shows translations around the ring."
      },
      "glassFixes": {
        "title": "Glass and legibility",
        "description": "Liquid Glass is back on the navigation, the search field, the bottom player, the now-playing card and the sign-in button. The search field no longer flows while you type, and the tab pill stays still. Glass edges no longer stair-step on high-scaled displays, and the navigation and search text stay readable over a pale wallpaper."
      }
    },
`,
    in: `    "v0_8_1": {
      "intro": "Rilis ini benar-benar memasukkan 0.7.28 dari proyek asal: gaya lirik baru, scene bioskop, penempatan tombol jendela, dan sejumlah perbaikan kaca serta ikon.",
      "scenes": {
        "title": "Scene: bioskop (beta)",
        "description": "Halaman pemutaran bisa berubah menjadi bioskop, dengan gaya lirik dan latar Anda di layar; geser untuk menengok sekeliling. Buka dari baris Scene di halaman tampilan. Versi desktop juga bisa melacak suara di ruangan. Tombol kembali kini menetap di sudut kiri atas halaman, tidak lagi mengikuti gaya lirik ke layar."
      },
      "newLook": {
        "title": "Ikon baru dan tanda platform",
        "description": "Ikon aplikasi baru: huruf F dari empat balok. Kesembilan penyedia musik memakai ikon aplikasi aslinya masing-masing, sama di tombol masuk, pengalih penyedia, dan halaman akun."
      },
      "windowControls": {
        "title": "Tombol jendela",
        "description": "Tombol jendela bisa di kiri atau kanan. Di macOS lampu lalu lintas bawaan sistem bisa mengambil alih, dan menu Dock mengendalikan pemutaran. Memulihkan dari tray dan meminimalkan kini sama-sama memperbarui tombol pemutaran di thumbnail taskbar."
      },
      "styleOptions": {
        "title": "Opsi gaya lirik baru",
        "description": "Monet bisa dicerminkan, potretnya dimatikan, dan deskripsinya disesuaikan. Dial jam bisa dimiringkan dan dilapis, serta mendapat tampilan hub. Lingkaran bisa dipindah dan menampilkan terjemahan di sekelilingnya."
      },
      "glassFixes": {
        "title": "Kaca dan keterbacaan",
        "description": "Liquid Glass kembali di navigasi, kolom pencarian, pemutar bawah, kartu sedang diputar, dan tombol masuk. Kolom pencarian tidak lagi mengalir saat mengetik, dan pil tab tetap diam. Tepi kaca tidak lagi bergerigi di layar berskala tinggi, dan teks navigasi serta pencarian tetap terbaca di atas wallpaper pucat."
      }
    },
`,
    vi: `    "v0_8_1": {
      "intro": "Bản này đưa 0.7.28 từ dự án gốc vào thật sự: kiểu lời bài hát mới, cảnh rạp chiếu phim, vị trí nút cửa sổ, cùng một loạt sửa lỗi kính và biểu tượng.",
      "scenes": {
        "title": "Cảnh: rạp chiếu phim (beta)",
        "description": "Trang phát nhạc có thể biến thành rạp chiếu phim, với kiểu lời và nền của bạn trên màn hình; kéo để nhìn quanh. Mở từ hàng Cảnh ở trang giao diện. Bản máy tính còn có thể dò âm thanh trong phòng. Nút quay lại giờ nằm ở góc trên bên trái của trang, không còn đi theo kiểu lời lên màn hình."
      },
      "newLook": {
        "title": "Biểu tượng mới và dấu nền tảng",
        "description": "Biểu tượng ứng dụng mới: chữ F ghép từ bốn khối. Cả chín nền tảng nhạc dùng biểu tượng ứng dụng thật của mình, giống nhau ở nút đăng nhập, bộ chuyển nền tảng và trang tài khoản."
      },
      "windowControls": {
        "title": "Nút cửa sổ",
        "description": "Nút cửa sổ có thể ở bên trái hoặc bên phải. Trên macOS có thể dùng đèn giao thông của hệ thống, và menu Dock điều khiển phát nhạc. Khôi phục từ khay và thu nhỏ giờ đều cập nhật nút phát trên ảnh thu nhỏ thanh tác vụ."
      },
      "styleOptions": {
        "title": "Tùy chọn kiểu lời mới",
        "description": "Monet có thể lật gương, tắt chân dung và đặt mô tả riêng. Mặt đồng hồ có thể nghiêng và phân lớp, và có thêm góc nhìn trục. Vòng lặp có thể di chuyển và hiện bản dịch quanh vòng."
      },
      "glassFixes": {
        "title": "Kính và độ đọc được",
        "description": "Liquid Glass đã trở lại trên thanh điều hướng, ô tìm kiếm, thanh phát dưới, thẻ đang phát và nút đăng nhập. Ô tìm kiếm không còn chảy khi gõ, và viên tab đứng yên. Viền kính không còn răng cưa trên màn hình tỉ lệ cao, và chữ ở thanh điều hướng cùng ô tìm kiếm vẫn đọc được trên hình nền nhạt."
      }
    },
`,
};

for (const [locale, block] of Object.entries(BLOCKS)) {
    const file = `src/i18n/locales/${locale}.ts`;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const at = lines.findIndex(line => /^\s+"v0_7_28": \{/.test(line));
    if (at < 0) throw new Error(`${locale}: no v0_7_28 block`);
    lines.splice(at, 0, ...block.replace(/\n$/, '').split('\n'));
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`${locale}: inserted before line ${at + 1}`);
}
