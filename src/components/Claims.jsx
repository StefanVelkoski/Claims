import React, { useEffect, useState } from "react";
import SingleClaim from "./partials/singleClaim";


export default function Claims (){


    const [ userOwnedItems , setUserOwnedItems ] = useState();
    const  bodyStyle = {
        minHeight: "700px"
    }

    const noClaimsAvailable = {
        textAlign: "center",
        fontSize: "25px",
        marginTop: "50px",
        fontFamily: "Whyte",
        fontWeight: "500",
        textTransform: "uppercase"
    }


    const claimsRow = []

    useEffect(() => {
        async function fetchData(){
            const response  = await fetch('https://ethereum-api.rarible.org/v0.1/nft/items/byOwner?owner=0x559441FEf78b7E27b66db69C11e5B3827e1aea96&includeMeta=false')
            const userOwnedNfts = await response.json();
            const  items = userOwnedNfts.items;
            setUserOwnedItems(items)
        }
        fetchData()

    }, []);

    function handleClaim(data, index){
        let filtered = userOwnedItems.filter(function(userOwnedItem, index) {
            return data != index;
          })
        setUserOwnedItems(filtered)
    }   




    if(userOwnedItems){
        userOwnedItems.map((userOwnedItem, index) => {
            claimsRow.push(
                <div className="col-md-3 col-lg-3">
                    
                <SingleClaim index={index} data={userOwnedItem} handleClaim={handleClaim}/>
                </div> 
            )   
        })
    }else{
        claimsRow.push(
            <div style={noClaimsAvailable} className="col-md-12 col-lg-12">
                    No items to claim. :(
            </div>  
        )
    }





    return(

        <div style={bodyStyle}>

            <div className="row" style={{width: "1300px", margin: "0px 300px 0px 0px", marginTop:"6%"} } >
                {claimsRow}
            </div>
        </div>
    )
}