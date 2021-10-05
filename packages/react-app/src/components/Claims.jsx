import React from "react";
import SingleClaim from "./partials/singleClaim";


export default function Claims (){

    const description = {
        fontSize: "25px",
        marginTop: "50px",
        fontFamily: "Whyte",
        fontWeight: "500",
        textTransform: "uppercase"
    }
    const claimsRow = []

    const claimsData = [
        {
            name: "Bastard",
            from: "0x559441FEf78b7E27b66db69C11e5B3827e1aea96",
            type: "jpg",
            tokenID: "ID"

        },
        {
            name: "Punk",
            from: "0x559441FEf78b7E27b66db69C11e5B3827e1aea96",
            type: "jpg",
            tokenID: "ID"

        },
        {
            name: "DystoPunk",
            from: "0x559441FEf78b7E27b66db69C11e5B3827e1aea96",
            type: "jpg",
            tokenID: ""

        },
        {
            name: "Blockart",
            from: "0x559441FEf78b7E27b66db69C11e5B3827e1aea96",
            type: "jpg",
            tokenID: ""

        },
        {
            name: "ArtBlock",
            from: "0x559441FEf78b7E27b66db69C11e5B3827e1aea96",
            type: "jpg",
            tokenID: ""

        }

    ]


    for (let i = 0;i<claimsData.length;i++){

        claimsRow.push(
            <div className="col-md-3 col-lg-3">
                    <SingleClaim data={claimsData[i]}/>
            </div>
     
        )
    }
    return(

        <div>
            <div style={description}>
                Ready to claim?
            </div>
            <div className="row" style={{width: "1300px", margin: "0px 300px 0px 0px", marginTop:"6%"} } >
                {claimsRow}
            </div>
        </div>
    )
}