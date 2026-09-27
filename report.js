const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function safe(value, fallback = "-") {
    return (
        value === undefined ||
        value === null ||
        value === ""
    )
        ? fallback
        : value;
}

function drawLine(doc) {
    doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

    doc.moveDown(0.5);
}

function addTitle(doc, title) {
    doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(title, {
            align: "center"
        });

    doc.moveDown();
}

function addHeading(doc, title) {
    doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(title);

    doc.moveDown(0.3);
}

function addField(doc, label, value) {
    doc
        .fontSize(10)
        .font("Helvetica")
        .text(
            `${label}: ${safe(value)}`
        );
}

function generateEngineeringReport({
    project,
    user,
    room,
    speakers,
    analysis,
    design,
    outputPath
}) {
    return new Promise(
        (resolve, reject) => {
            try {
                const doc =
                    new PDFDocument({
                        size: "A4",
                        margin: 50
                    });

                const stream =
                    fs.createWriteStream(
                        outputPath
                    );

                doc.pipe(stream);

                // COVER
                doc
                    .fontSize(26)
                    .font("Helvetica-Bold")
                    .text(
                        "ACOUSTIC ENGINEERING",
                        {
                            align: "center"
                        }
                    );

                doc.moveDown();

                doc
                    .fontSize(16)
                    .font("Helvetica")
                    .text(
                        "Professional Sound System Design Report",
                        {
                            align: "center"
                        }
                    );

                doc.moveDown(3);

                doc
                    .fontSize(18)
                    .font("Helvetica-Bold")
                    .text(
                        safe(project.name),
                        {
                            align: "center"
                        }
                    );

                doc.moveDown(4);

                doc
                    .fontSize(10)
                    .text(
                        `Generated: ${new Date().toLocaleString()}`
                    );

                doc.addPage();

                // PROJECT
                addTitle(
                    doc,
                    "1. Project Information"
                );

                addField(
                    doc,
                    "Project",
                    project.name
                );

                addField(
                    doc,
                    "Project Type",
                    project.project_type
                );

                addField(
                    doc,
                    "Client",
                    user.name
                );

                addField(
                    doc,
                    "Phone",
                    user.phone
                );

                addField(
                    doc,
                    "Company",
                    user.company
                );

                doc.moveDown();
                drawLine(doc);

                // ROOM
                addHeading(
                    doc,
                    "2. Room Geometry"
                );

                addField(
                    doc,
                    "Width",
                    `${room.width} m`
                );

                addField(
                    doc,
                    "Length",
                    `${room.length} m`
                );

                addField(
                    doc,
                    "Height",
                    `${room.height} m`
                );

                addField(
                    doc,
                    "Area",
                    `${room.area.toFixed(2)} m²`
                );

                addField(
                    doc,
                    "Volume",
                    `${room.volume.toFixed(2)} m³`
                );

                doc.moveDown();

                // DESIGN
                addHeading(
                    doc,
                    "3. Design Method"
                );

                addField(
                    doc,
                    "Design Mode",
                    project.design_mode
                );

                addField(
                    doc,
                    "AI Strategy",
                    design?.strategy
                );

                addField(
                    doc,
                    "Design Score",
                    design?.score
                );

                doc.moveDown();

                // ANALYSIS
                addHeading(
                    doc,
                    "4. Acoustic Analysis"
                );

                addField(
                    doc,
                    "Average SPL",
                    `${safe(
                        analysis?.averageSPL,
                        0
                    )} dB`
                );

                addField(
                    doc,
                    "Minimum SPL",
                    `${safe(
                        analysis?.minimumSPL,
                        0
                    )} dB`
                );

                addField(
                    doc,
                    "Maximum SPL",
                    `${safe(
                        analysis?.maximumSPL,
                        0
                    )} dB`
                );

                addField(
                    doc,
                    "Uniformity",
                    `${safe(
                        analysis?.uniformity,
                        0
                    )}%`
                );

                doc.moveDown();

                // SPEAKERS
                addHeading(
                    doc,
                    "5. Equipment"
                );

                speakers.forEach(
                    (speaker, index) => {
                        doc
                            .fontSize(10)
                            .text(
                                `${index + 1}. ${
                                    speaker.manufacturer
                                } ${
                                    speaker.model
                                }`
                            );

                        doc
                            .fontSize(9)
                            .text(
                                `Category: ${
                                    speaker.category
                                } | RMS: ${
                                    speaker.rms_power
                                } W | Max SPL: ${
                                    speaker.max_spl
                                } dB`
                            );

                        doc.moveDown(0.4);
                    }
                );

                doc.moveDown();

                // LAYOUT
                addHeading(
                    doc,
                    "6. Speaker Layout"
                );

                const placements =
                    design?.speakers || [];

                placements.forEach(
                    (item, index) => {
                        doc
                            .fontSize(9)
                            .text(
                                `${item.id} | ${
                                    item.model
                                } | X: ${
                                    Number(
                                        item.x
                                    ).toFixed(2)
                                } m | Y: ${
                                    Number(
                                        item.y
                                    ).toFixed(2)
                                } m | Z: ${
                                    Number(
                                        item.z || 0
                                    ).toFixed(2)
                                } m | Angle: ${
                                    Number(
                                        item.angle || 0
                                    ).toFixed(1)
                                }°`
                            );
                    }
                );

                doc.moveDown();

                // BOQ
                addHeading(
                    doc,
                    "7. Bill of Quantities"
                );

                const counts = {};

                placements.forEach(
                    item => {
                        const key =
                            `${item.manufacturer} ${item.model}`;

                        counts[key] =
                            (counts[key] || 0) + 1;
                    }
                );

                Object.entries(
                    counts
                ).forEach(
                    ([model, quantity]) => {
                        doc
                            .fontSize(10)
                            .text(
                                `${model} — Qty: ${quantity}`
                            );
                    }
                );

                doc.moveDown();

                // NOTES
                addHeading(
                    doc,
                    "8. Engineering Notes"
                );

                doc
                    .fontSize(10)
                    .text(
                        "This report is generated by Acoustic Engineering. "
                        + "The calculated values are design estimates based "
                        + "on the supplied room geometry and loudspeaker data. "
                        + "Final commissioning should be verified on site "
                        + "using appropriate measurement equipment."
                    );

                doc.moveDown();

                doc
                    .fontSize(8)
                    .text(
                        "Acoustic Engineering — Intelligent Acoustic & Sound System Design Platform",
                        {
                            align: "center"
                        }
                    );

                doc.end();

                stream.on(
                    "finish",
                    () => resolve(outputPath)
                );

                stream.on(
                    "error",
                    reject
                );
            } catch (error) {
                reject(error);
            }
        }
    );
}

module.exports = {
    generateEngineeringReport
};