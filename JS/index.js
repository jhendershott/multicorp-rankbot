var Bank = require("./Bank");
var Ranks = require("./Ranks");

const Discord = require("discord.js")
const client = new Discord.Client()

const rankUtilities = new Ranks();
const bank = new Bank();

client.login(process.env.BotToken)

client.on("message", msg => {
    try{
      if (msg.content.toLowerCase().startsWith("!updaterank")) {
        if(msg.member.hasPermission('MANAGE_ROLES')){
        var newRank = msg.content.split(/ +/);;
        var updateFrom
        var updateTo 
        var rankFrom
        var rankTo
        if(newRank[2].includes('>')){
          var rankUpdates = newRank[2].split('>'); 
          updateFrom = rankUpdates[0];
          updateTo = rankUpdates[1];   
          rankFrom = msg.guild.roles.cache.find(role => role.name === rankUtilities.GetRank(updateFrom).rank);
        }
        else {
          updateTo = newRank[2];
        }

        if(rankUtilities.rankList.includes(updateTo.toUpperCase())){
          var rankTo = msg.guild.roles.cache.find(role => role.name === rankUtilities.GetRank(updateTo).rank);
          var member = msg.mentions.members.first();
          
          if(member !== undefined){ 
            member.roles.add(rankTo).catch(console.error);
            if(rankFrom !== undefined){
              member.roles.remove(rankFrom).catch(console.error);
            }

            var nick = member.nickname;

            var newNick = `${rankUtilities.GetRank(updateTo, msg).abbrev}. ${rankUtilities.ClearAllRanks(nick)}`
            member.setNickname(newNick);
          }
          else{
            msg.reply('No Member Defined');
          }
        }
        else{
          msg.reply(`Rank ${updateTo} Could not be found in list`);
        }
        
      }else{
        msg.reply("You can't change roles, who do you think ya are? Ya MUPPET!")
      }
    }  
    }catch(e){
      msg.reply(`WNR's the muppet and screwed something up`)
    }
  }
)

client.on("message", msg => {
  try{
    if(msg.content.toLowerCase().startsWith("!handle")){
      var handleCmd = msg.content.split(/ +/);
      var newNick
      if(handleCmd.length === 3){
        member = msg.mentions.members.first()
        newNick = handleCmd[2];
      }

      else if(handleCmd.length === 2){
        var member = msg.member
        newNick = handleCmd[1];
      }

      if(member.nickname !== undefined && member.nickname !== null){
        var rank = rankUtilities.HasRank(member.nickname)
        
        if(rank !== null){
          member.setNickname(`${rank.abbrev}. ${newNick}`);
        }
        else{
          member.setNickname(newNick);
        }
      }
      else{
        member.setNickname(newNick);
      }
    }
  }catch(e){
    msg.reply(`WNR's the muppet and screwed something up`)
    msg.reply(e);
  }
})

client.on("message", msg => {
  try{
    if (msg.content.toLowerCase().startsWith("!promote")) {
      if(msg.member.hasPermission('MANAGE_ROLES')){
        var newRank = msg.content.split(/ +/);;
        
        var members = msg.mentions.members.array()
        var newMsg = `Congratulations on your recent promotions! Well Earned!`
        var membersArrayString = '';

        for(let member of members){
          var currentRank = rankUtilities.HasRank(member.nickname);
          var rankTo = rankUtilities.RankByNumber(currentRank.num + parseInt(newRank[1]))

          var roleFrom = msg.guild.roles.cache.find(role => role.name === currentRank.rank);
          var roleTo = msg.guild.roles.cache.find(role => role.name === rankTo.rank);

          member.roles.add(roleTo).catch(console.error);
          member.roles.remove(roleFrom).catch(console.error);
          
          var nick = member.nickname;

          var newNick = `${rankTo.abbrev}. ${rankUtilities.ClearAllRanks(nick)}`
          member.setNickname(newNick);
          membersArrayString = (`${membersArrayString} <@${member.id}>`);
          }
          msg.delete();
          if(members.length > 1){
            msg.channel.send(`Congratulations on your promotions! Well Earned! ${membersArrayString}`)
              .then(msg => console.log(`Updated the content of a message to ${msg.content}`))
              .catch(console.error);
          } 
          else{
            msg.channel.send(`Congratulations on your promotion! Well Earned! ${membersArrayString}`)
              .then(msg => console.log(`Updated the content of a message to ${msg.content}`))
              .catch(console.error);
          }
      }else{
        msg.reply("You can't change roles, who do you think ya are? Ya MUPPET!")
      }
    }  
  }catch(e){
    console.log(e);
    msg.reply(`WNR's the muppet and screwed something up`)
  }
})

client.on("message",async msg => {
  try{
    if (msg.content.toLowerCase().startsWith("!bank")) {
      var args = msg.content.split(/ +/);;
      var orgId = await bank.GetOrgId(msg.guild.name);
      if(args[1].toLowerCase() === 'balance'){
        var balance = await bank.GetBalanceNewConnect(msg.guild.name);
        msg.channel.send(`${numberWithCommas(balance)} aUEC`)
      }

      else if(args[1].toLowerCase() === 'deposit' && args.length === 3){
        if(msg.member.roles.cache.find(r => r.name === "Banker")){
          var deposit = await bank.Deposit(rankUtilities.ClearAllRanks(msg.member.nickname), args[2], msg.guild.name);
          msg.channel.send(`Thank you for your contribution: New Balance = ${deposit} aUEC`)
        }
        else{
          msg.channel.send(`Please see your banker to make a deposit`)
        }
      }
      else if(args[1].toLowerCase() === 'deposit' && args.length === 4){
        if(msg.member.roles.cache.find(r => r.name === "Banker")){
          var deposit = await bank.Deposit(rankUtilities.ClearAllRanks(msg.mentions.members.first().nickname), args[2], msg.guild.name);
          msg.channel.send(`Thank you for your contribution: New Balance = ${deposit} aUEC`)
        }
        else{
          msg.channel.send(`Please see your banker to make a deposit`)
        }
      }

      if(args[1].toLowerCase() === 'contribution' && args.length === 2){
        var nickname = msg.member.nickname
        var cleanedNick = rankUtilities.ClearAllRanks(nickname);
        var orgId = await bank.GetOrgId(msg.guild.name);
        var memberId = await bank.GetMemberId(cleanedNick, orgId);
        if(!memberId){
          await bank.AddMember(cleanedNick, orgId);
          msg.channel.send(`It appears you are not on our books but have been to the ledger`);
        }else{
          var transid = await bank.GetTransactionId(memberId)
          if(transid){
            msg.channel.send(`Total Contributions from ${nickname} = ${await bank.GetTransactionAmount(transid)} aUEC`)
          }
          else{
            msg.channel.send(`You have not contributed to MultiCorp Bank`)
          }  
        }      
      } 
      
      else if(args[1].toLowerCase() === 'contribution' && args.length === 3){
        var nickname = msg.mentions.members.first().nickname
        var cleanedNick = rankUtilities.ClearAllRanks(nickname);
        var memberId = await bank.GetMemberId(cleanedNick, orgId);
        if(!memberId){
          await bank.AddMember(cleanedNick, orgId);
          msg.channel.send(`It appears ${nickname} isn't on our books but has been to the ledger`);
        }else{
          var transid = await bank.GetTransactionId(memberId)
          if(transid){
            msg.channel.send(`Total Contributions from ${nickname} = ${await bank.GetTransactionAmount(transid)} aUEC`)
          }
          else{
            msg.channel.send(`${nickname} has not contributed to MultiCorp Bank`)
          }  
        }
      }

      if(args[1].toLowerCase() === 'withdraw'){
        if(msg.member.roles.cache.find(r => r.name === "Banker")){
          var withdraw = await bank.Withdraw(args[2], msg.guild.name);
          msg.channel.send(`You have withdrawn ${args[2]} aUEC: New Balance = ${withdraw} aUEC`)
        }
        else{
          msg.channel.send("Come on, muppets like you can't pull out money willy nilly!");
        }
      }
    }

  } catch (e){
    console.log(e)
  }
})

client.on("message",async msg => {
  try{
    var args = msg.content.split(/ +/);;
    if (msg.content.toLowerCase().startsWith("!multibot-help") && args.length === 1 && msg.guild.name === 'MultiCorp') {
      msg.channel.send("MultiBot is your one stop shop for all your needs");
      msg.channel.send("Try out !Handle {new handle name} will update your your name while keeping your rank");
      msg.channel.send("Try !MultiBot-Help Promote !Promote will manage members roles ");
      msg.channel.send("Try !MultiBot-Help Bank will help you manage the org bank");
    }
    else if(msg.content.toLowerCase().startsWith("!multibot-help") && args.length === 1 && msg.guild.name !== 'MultiCorp') {
      msg.channel.send("MultiBot is your one stop shop for all your needs");
      msg.channel.send("Try out !Handle {new handle name} will update your your name while keeping your rank");
      msg.channel.send("Try !MultiBot-Help Bank will help you manage the org bank");
    }
    else if (msg.content.toLowerCase().startsWith("!multibot-help") && args[1].toLowerCase() === 'bank') {
      msg.channel.send("Try out !Bank Deposit {amount} - will add to the account and your contributions");
      msg.channel.send("Try out !Bank Deposit {amount} {tagged server member} - will add to the account and their contributions");
      msg.channel.send("Try out !Bank Contribution - will display your total contributions to the bank");
      msg.channel.send("Try out !Bank Contribution {tagged server name} - will display their total contributions to the bank");
      msg.channel.send("Try out !Bank Withdraw - will withdraw funds from the org bank *Note only Bankers are allowed to withdraw*");  
    }
    
    else if (msg.content.toLowerCase().startsWith("!multibot-help") && args[1].toLowerCase() === 'promote') {
      msg.channel.send("Try out !Promote {how many ranks} {tagged server members} - will increase ranks of member");
      msg.channel.send("This will update their rank on the server as well as their nickname");
      msg.channel.send("Only members with MANAGE_ROLES permissions can promote");
    }
  } catch (e){
    console.log(e)
  }
})


// client.on("guildMemberAdd", (member) => {
//   let role = member.guild.roles.cache.find(role => role.name === 'Recruit');
//   member.roles.add(role).catch(console.error);
//   member.setNickName(`RCT. ${member.displayName}`).catch(console.error);
// });

function numberWithCommas(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}