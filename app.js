// ==UserScript==
// @name         豆瓣x广州图书馆
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  查询广州图书馆可借阅馆藏
// @author       https://honwhy.wang
// @match        https://book.douban.com/subject/*
// @icon         <$ICON$>
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const info = document.querySelector("#info")
    var cts = info.textContent.split(/\n/).filter(item => item.replaceAll(/\s|\t| /g,'').length> 0)
    var isbn = cts[cts.length-1].match(/(\d+)/)[1]
    console.log(isbn)
    if(isbn) {
        console.log('begin to search')
        getBooks({isbn: isbn});

    }

    function getBooks(request) {
        let {isbn, title} = request;
        if (isbn == 0) {
            return {};
        }
        var url = '';
        if (title) {
            url = `https://opac.gzlib.org.cn/opac/search?&q=${title}&searchWay=title&sortWay=score&sortOrder=desc&scWay=dim&hasholding=1&curlibcode=TH&curlibcode=NS&curlibcode=BY&curlibcode=HP&curlibcode=PY&curlibcode=YT&curlibcode=LW&curlibcode=GT&curlibcode=HZQ&searchSource=reader`;
        } else {
            url = `https://opac.gzlib.org.cn/opac/search?searchWay0=isbn&q0=${isbn}&logical0=AND&searchWay1=&q1=&logical1=AND&searchWay2=&q2=&searchSource=reader&marcformat=&sortWay=score&sortOrder=desc&startPubdate=&endPubdate=&rows=10&hasholding=1&curlibcode=GT&curlibcode=YT&curlibcode=HZQ&curlibcode=LW&curlibcode=TH&curlibcode=BY&curlibcode=HP&curlibcode=PY&curlibcode=NS`;
        }
        try {
            //let response = GM.xmlHttpRequest(url, { mode: 'no-cors' });
            // .then(r => r.text())
            // .then(result => {
            //     return result;
            // })
            //return response.text();
            GM.xmlHttpRequest({
                method: "POST",
                url: url,
                //data: "username=johndoe&password=xyz123",
                //headers: {
                //    "Content-Type": "application/x-www-form-urlencoded"
                //},
                onload: function(response) {
                    if(response.status == 200) {
                        var text = response.responseText;
                        var ms = text.match(/bookrecno=([0-9]+)/mg);
                        if(ms) {
                            var nos = ms.map(m => {
                                return m.split('=')[1];
                            });
                            if(nos && nos.length > 0) {
                                getBorrowable(nos.join(','));
                            }
                        }
                    }
                }
            });
        } catch(e){
            console.log(e)
        }

    }
    function getBorrowable(item) {
        let url = `https://opac.gzlib.org.cn/opac/book/holdingPreviews?bookrecnos=${item}&curLibcodes=HZQ%2CGT%2CLW%2CYT%2CPY%2CHP%2CBY%2CNS%2CTH&return_fmt=json`;
        var text = '{}';
        try {
            GM.xmlHttpRequest({
                method: "POST",
                url: url,
                //data: "username=johndoe&password=xyz123",
                //headers: {
                //    "Content-Type": "application/x-www-form-urlencoded"
                //},
                onload: function(response) {
                    if(response.status != 200) {
                        return false;
                    }
                    var text = response.responseText;
                    var json = JSON.parse(text);
                    let nameToCount = {};
                    if (json && json['previews']) {
                        Object.keys(json['previews']).forEach(key => {
                            // item => {bookrecno: 3005135912, callno: 'I247.57/10039', curlib: 'NS', curlibName: '南沙区图书馆', curlocal: 'NS-LHZTSS', …}
                            var a = json['previews'][key];
                            a.forEach(item => {
                                if(item.loanableCount > 0) {
                                    if(nameToCount[item.curlibName]) {
                                        nameToCount[item.curlibName] += item.loanableCount;
                                    } else {
                                        nameToCount[item.curlibName] = item.loanableCount;
                                    }
                                }
                            });
                        })

                    }
                    // set to html
                    var aside = document.querySelector(".aside");

                    var gray = document.createElement('div');
                    gray.classList = 'gray_ad version_works';
                    var h2 = document.createElement('h2');
                    h2.textContent = '广州图书馆可借馆藏';
                    gray.appendChild(h2);
                    var ul = document.createElement('ul');
                    Object.keys(nameToCount).forEach(key => {
                        var cnt = nameToCount[key];
                        var li = document.createElement('li');
                        li.styleList = 'mb8 pl';
                        var a = document.createElement('a');
                        a.href = 'javascript:void(0)';
                        a.textContent = `${key} (${cnt})`;
                        li.appendChild(a);

                        ul.appendChild(li);
                    })
                    gray.appendChild(ul);

                    aside.prepend(gray);
                }
            })
        } catch(e) {

        }

    }
})();
