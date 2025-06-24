odoo.define('sign_custom_full.signature', function (require) {
    "use strict";

    const rpc = require('web.rpc');

    window.addEventListener('DOMContentLoaded', function () {
        const canvas = document.getElementById("signature-pad");
        const clearBtn = document.getElementById("sign-clear");
        const submitBtn = document.getElementById("sign-submit");
        const ctx = canvas.getContext("2d");
        let drawing = false;

        canvas.addEventListener("mousedown", () => drawing = true);
        canvas.addEventListener("mouseup", () => drawing = false);
        canvas.addEventListener("mousemove", draw);

        function draw(e) {
            if (!drawing) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.strokeStyle = "#000";
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        }

        clearBtn.addEventListener("click", function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        submitBtn.addEventListener("click", function () {
            const data = canvas.toDataURL("image/png"); // Base64 image
            const signerId = parseInt(window.location.pathname.split("/")[3]);
            const token = window.location.pathname.split("/")[4];

            rpc.query({
                route: "/sign/submit",
                params: { signer_id: signerId, token: token, signature_data: data }
            }).then(function (result) {
                if (result.success) {
                    alert("Cảm ơn bạn đã ký!");
                    location.reload();
                }
            });
        });
    });
});
