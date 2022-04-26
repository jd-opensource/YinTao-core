await page.setDevice("iPhone 6")
await cookies.setAll("https://bao.tjjt360.com","_gia_s_local_fingerprint=f6202d71fb637fb2e52579f66a714bf3;3AB9D23F7A4B3C9B=RPX2UCA3ITUDJ7DQKDLHXEZQOJTZJ52QOUXRFZSVQGXIC6SQUTRXOE2RXKOEB2M75D725ZO2FRLHK3QNNFYBHC57VE;qid_uid=0874faf0-c0ad-493c-929d-1de90b261da6;qid_ad=androidapp%7Ct_335139774%7Cappshare%7CWxfriends%7C10;qid_sid=0874faf0-c0ad-493c-929d-1de90b261da6-2;pt_key=AAJiZOVwADChdgoBDYJNb80I-BkSccW26oXJvheGJUd8XPjd_7ho5OuNnkonYwJskuH8j2AOKs8;pt_pin=%E6%B5%85%E4%B8%B6%E5%B0%8F%E6%B1%90;pwdt_id=%E6%B5%85%E4%B8%B6%E5%B0%8F%E6%B1%90;sfstoken=tk01med991d69a8sMSsxeDJ4MisyMTeLjiilBMbexfeM5OIyh8yFzhSEV/SPPfirzLjmoli4Yk19CxtTNAR/dlb7hAjQ;_gia_s_e_joint={\"eid\":\"RPX2UCA3ITUDJ7DQKDLHXEZQOJTZJ52QOUXRFZSVQGXIC6SQUTRXOE2RXKOEB2M75D725ZO2FRLHK3QNNFYBHC57VE\",\"ma\":\"\",\"im\":\"\",\"os\":\"Mac OS X (iPhone)\",\"ip\":\"111.202.148.47\",\"ia\":\"\",\"uu\":\"\",\"at\":\"6\"};")
await page.to("https://bao.tjjt360.com/insurance/jmiProduct/x?merchantNo=1018120002&extSkuId=200151389583&un_area=1_2805_55636_0&sid=25c2357a6be24e513df8c9124868498w&pid=40000410&_ts=1647608461359&ad_od=share&utm_source=androidapp&utm_medium=appshare&utm_campaign=t_335139774&utm_term=Wxfriends",{timeout:30000})
await sleep(3000)
console.log('开始滚动')
await mouse.wheel(0,300) // 页面向下滚动
await sleep(3000);
console.log("开始滚动")